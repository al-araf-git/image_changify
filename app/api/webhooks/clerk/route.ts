// import { WebhookEvent } from "@clerk/nextjs/server";
// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import { Webhook } from "svix";

// import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
// import { clerkClient } from "@clerk/clerk-sdk-node";

// export async function POST(req: Request) {
//   const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

//   if (!WEBHOOK_SECRET) {
//     console.error("WEBHOOK_SECRET is missing from environment variables.");
//     return new Response("Server configuration error", { status: 500 });
//   }

//   const headerPayload = await headers();
//   const svixHeaders = {
//     id: headerPayload.get("svix-id"),
//     timestamp: headerPayload.get("svix-timestamp"),
//     signature: headerPayload.get("svix-signature"),
//   };

//   if (!svixHeaders.id || !svixHeaders.timestamp || !svixHeaders.signature) {
//     console.error("Missing Svix headers in the request.");
//     return new Response("Invalid request headers", { status: 400 });
//   }

//   const body = await req.text(); // Raw body for verification

//   const webhook = new Webhook(WEBHOOK_SECRET);

//   let event: WebhookEvent & { id?: string }; // Extending the type to include `id`

//   try {
//     event = webhook.verify(body, {
//       "svix-id": svixHeaders.id,
//       "svix-timestamp": svixHeaders.timestamp,
//       "svix-signature": svixHeaders.signature,
//     }) as WebhookEvent & { id?: string }; // Cast to include `id`
//   } catch (err) {
//     console.error("Webhook verification failed:", err);
//     return new Response("Unauthorized request", { status: 401 });
//   }

//   const { id, type: eventType, data } = event;
//   console.log(`Received webhook: ID=${id || "unknown"}, Type=${eventType}`);

//   try {
//     switch (eventType) {
//       case "user.created":
//         return handleUserCreated(data);

//       case "user.updated":
//         return handleUserUpdated(data);

//       case "user.deleted":
//         return handleUserDeleted(data);

//       default:
//         console.warn(`Unhandled webhook event type: ${eventType}`);
//         return new Response("Event ignored", { status: 200 });
//     }
//   } catch (err) {
//     console.error("Error processing webhook event:", err);
//     return new Response("Internal server error", { status: 500 });
//   }
// }

// async function handleUserCreated(data: any) {
//   const { id, email_addresses, image_url, first_name, last_name, username } = data;

//   const user = {
//     clerkId: id,
//     email: email_addresses[0]?.email_address || null,
//     username: username || "",
//     firstName: first_name || "",
//     lastName: last_name || "",
//     photo: image_url || "",
//   };

//   const newUser = await createUser(user);

//   if (newUser) {
//     try {
//       await clerkClient.users.updateUserMetadata(id, {
//         publicMetadata: {
//           userId: newUser._id,
//         },
//       });
//     } catch (err) {
//       console.error("Failed to update Clerk user metadata:", err);
//     }
//   }

//   return NextResponse.json({ message: "User created successfully", user: newUser });
// }

// async function handleUserUpdated(data: any) {
//   const { id, image_url, first_name, last_name, username } = data;

//   const user = {
//     firstName: first_name || "",
//     lastName: last_name || "",
//     username: username || "",
//     photo: image_url || "",
//   };

//   const updatedUser = await updateUser(id, user);
//   return NextResponse.json({ message: "User updated successfully", user: updatedUser });
// }

// async function handleUserDeleted(data: any) {
//   const { id } = data;

//   const deletedUser = await deleteUser(id);
//   return NextResponse.json({ message: "User deleted successfully", user: deletedUser });
// }





/* eslint-disable camelcase */
// import { clerkClient } from "@clerk/nextjs";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
import { clerkClient } from "@clerk/clerk-sdk-node";

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

 // CREATE
if (eventType === "user.created") {
    const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;
  
    const user = {
      clerkId: id,
      email: email_addresses[0].email_address,
      username: username!,
      firstName: first_name || "", // Default to an empty string if null
      lastName: last_name || "", // Default to an empty string if null
      photo: image_url,
    };
  
    const newUser = await createUser(user);
  
    // Set public metadata
    if (newUser) {
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          userId: newUser._id,
        },
      });
    }
  
    return NextResponse.json({ message: "OK", user: newUser });
  }
  
  // UPDATE
  if (eventType === "user.updated") {
    const { id, image_url, first_name, last_name, username } = evt.data;
  
    const user = {
      firstName: first_name || "", // Default to an empty string if null
      lastName: last_name || "", // Default to an empty string if null
      username: username!,
      photo: image_url,
    };
  
    const updatedUser = await updateUser(id, user);
  
    return NextResponse.json({ message: "OK", user: updatedUser });
  }

  // DELETE
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    const deletedUser = await deleteUser(id!);

    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log("Webhook body:", body);

  return new Response("", { status: 200 });
}