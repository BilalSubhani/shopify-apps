import { json } from '@remix-run/node';
import { prisma } from '../db.server';
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const PAGE_SIZE = 5;

  const allCursorsQuery = `
    query {
      products(first: ${PAGE_SIZE * page}) {
        edges {
          cursor
        }
      }
    }
  `;

  const allCursorsResp = await admin.graphql(allCursorsQuery);
  const allCursorsData = await allCursorsResp.json();
  const cursors = allCursorsData?.data?.products?.edges?.map(e => e.cursor) || [];

  const afterCursor = page > 1 ? cursors[(page - 1) * PAGE_SIZE - 1] : null;

  const productQuery = `
    query paginateProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
        edges {
          cursor
          node {
            id
            title
            totalInventory
            metafield(namespace: "custom", key: "badge") {
              value
            }
          }
        }
      }
    }
  `;

  const variables = {
    first: PAGE_SIZE,
    after: afterCursor,
  };

  const paginatedResp = await admin.graphql(productQuery, { variables });
  const jsonData = await paginatedResp.json();

  const edges = jsonData?.data?.products?.edges || [];
  const pageInfo = jsonData?.data?.products?.pageInfo || {};

  const products = edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    inventory: node.totalInventory,
    badge: node.metafield?.value || 'N/A',
  }));

  const badgeList = await prisma.badge.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return json({
    products,
    badgeList,
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: page > 1,
    pageInfo,
  });
};

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const form = await request.formData();

    const productId = form.get('productId');
    let badgeName = form.get('badgeName');

    if (!badgeName || badgeName === 'undefined') {
      badgeName = 'N/A';
    }

    const mutation = `
      mutation {
        metafieldsSet(
          metafields: [
            {
              namespace: "custom"
              key: "badge"
              type: "single_line_text_field"
              value: "${badgeName}"
              ownerId: "${productId}"
            }
          ]
        ) {
          metafields {
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation);
    const jsonData = await response.json();

    const errors = jsonData?.data?.metafieldsSet?.userErrors || [];

    if (errors.length > 0) {
      return json({ success: false, errors }, { status: 400 });
    }

    return json({ success: true, productId });
  } catch (err) {
    console.error("Error in metafieldsSet mutation:", err);
    return json({ success: false, message: 'Something went wrong while saving the badge.' }, { status: 500 });
  }
};
