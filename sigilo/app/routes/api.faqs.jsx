import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');

  if (productId) {
    const query = `
      query {
        product(id: "${productId}") {
          metafield(namespace: "custom", key: "faq") {
            value
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const responseJson = await response.json();
    const faqs = responseJson?.data?.product?.metafield?.value 
      ? JSON.parse(responseJson.data.product.metafield.value)
      : [];

    return json({ faqs });
  } else {
    const response = await admin.graphql(
      `query {
        products(first: 250) {
          edges {
            node {
              id
              title
            }
          }
        }
      }`
    );

    const responseJson = await response.json();
    const products = responseJson.data.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
    }));

    return json({ products });
  }
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get('productId');
  const intent = formData.get('intent');

  try {
    const getQuery = `
      query {
        product(id: "${productId}") {
          metafield(namespace: "custom", key: "faq") {
            value
          }
        }
      }
    `;

    const getResponse = await admin.graphql(getQuery);
    const getData = await getResponse.json();
    let faqs = getData?.data?.product?.metafield?.value 
      ? JSON.parse(getData.data.product.metafield.value)
      : [];

    switch (intent) {
      case 'add': {
        const newFaq = {
          id: crypto.randomUUID(),
          question: formData.get('question'),
          answer: formData.get('answer'),
        };
        faqs.push(newFaq);
        break;
      }
      case 'edit': {
        const faqId = formData.get('faqId');
        const index = faqs.findIndex(faq => faq.id === faqId);
        if (index !== -1) {
          faqs[index] = {
            ...faqs[index],
            question: formData.get('question'),
            answer: formData.get('answer'),
          };
        }
        break;
      }
      case 'delete': {
        const faqId = formData.get('faqId');
        faqs = faqs.filter(faq => faq.id !== faqId);
        break;
      }
    }

    const mutation = `
      mutation {
        metafieldsSet(
          metafields: [
            {
              namespace: "custom"
              key: "faq"
              type: "json"
              value: ${JSON.stringify(JSON.stringify(faqs))}
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
    const responseJson = await response.json();

    const errors = responseJson?.data?.metafieldsSet?.userErrors || [];
    if (errors.length > 0) {
      return json({ error: errors[0].message }, { status: 400 });
    }

    return json({ success: true, faqs });
  } catch (error) {
    console.error('Error managing FAQs:', error);
    return json({ error: 'Failed to manage FAQs' }, { status: 500 });
  }
} 