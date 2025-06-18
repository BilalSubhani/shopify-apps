import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { Prisma } from "@prisma/client";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const badges = await prisma.badge.findMany({
    orderBy: { createdAt: "desc" },
  });

  return json(badges, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
};

export const action = async ({ request }) => {
  await authenticate.admin(request);

  const form = await request.formData();
  const intent = form.get("intent");
  console.log("Received form data:", Object.fromEntries(form.entries()));

  try {
    switch (intent) {
      case "create": {
        const name = form.get("name");
        const icon = form.get("icon");

        if (!name || !icon) {
          console.log("Missing required fields:", { name, icon });
          return json(
            { error: "Name and icon are required." },
            { status: 400 },
          );
        }

        console.log("Creating badge with data:", { name, icon });
        const badge = await prisma.badge.create({
          data: { name, icon },
        });
        console.log("Created badge:", badge);

        return json(badge, { headers: { "Cache-Control": "no-store" } });
      }

      case "update": {
        const id = form.get("id");
        const name = form.get("name");
        const icon = form.get("icon");

        if (!id || !name || !icon) {
          console.log("Missing required fields:", { id, name, icon });
          return json(
            { error: "ID, name and icon are required." },
            { status: 400 },
          );
        }

        console.log("Updating badge with data:", { id, name, icon });
        const badge = await prisma.badge.update({
          where: { id },
          data: { name, icon },
        });
        console.log("Updated badge:", badge);

        return json(badge, { headers: { "Cache-Control": "no-store" } });
      }

      case "delete": {
        const id = form.get("id");

        if (!id) {
          console.log("Missing required field:", { id });
          return json(
            { error: "ID is required for deletion." },
            { status: 400 },
          );
        }

        console.log("Deleting badge:", id);
        const badge = await prisma.badge.delete({
          where: { id },
        });
        console.log("Deleted badge:", badge);

        return json(badge, { headers: { "Cache-Control": "no-store" } });
      }

      case "getById": {
        const id = form.get("id");

        if (!id) {
          console.log("Missing required field:", { id });
          return json(
            { error: "ID is required to fetch badge." },
            { status: 400 },
          );
        }

        console.log("Fetching badge:", id);
        const badge = await prisma.badge.findUnique({
          where: { id },
        });
        console.log("Fetched badge:", badge);

        return json(badge, { headers: { "Cache-Control": "no-store" } });
      }

      default:
        console.log("Unknown intent:", intent);
        return json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    console.error("Badge API error:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return json({ error: "Badge not found." }, { status: 404 });
    }

    return json({ error: "Internal server error." }, { status: 500 });
  }
};
