import { json } from "@remix-run/node";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const tasks = await prisma.task.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' }
  });

  return json(tasks);
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const action = formData.get("action");

  switch (action) {
    case "create": {
      const title = formData.get("title");
      const description = formData.get("description");

      const task = await prisma.task.create({
        data: {
          title,
          description,
          shop,
        },
      });

      return json(task);
    }

    case "update": {
      const id = formData.get("id");
      const title = formData.get("title");
      const description = formData.get("description");
      const completed = formData.get("completed") === "true";

      const task = await prisma.task.update({
        where: { id },
        data: {
          title,
          description,
          completed,
        },
      });

      return json(task);
    }

    case "delete": {
      const id = formData.get("id");

      await prisma.task.delete({
        where: { id },
      });

      return json({ success: true });
    }

    case "deleteCompleted": {
      await prisma.task.deleteMany({
        where: {
          shop,
          completed: true,
        },
      });

      return json({ success: true });
    }

    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
} 