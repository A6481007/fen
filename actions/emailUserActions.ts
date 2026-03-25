"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { client } from "@/sanity/lib/client";

// Types for server actions
interface CreateAddressData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  isDefault?: boolean;
}

interface CartItem {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

// Address Management Actions (Email-based)
export async function createAddressForUser(addressData: CreateAddressData) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      throw new Error("User not authenticated");
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // If this is set as default, unset all other default addresses for this email
    if (addressData.isDefault) {
      const existingAddresses = await client.fetch(
        `*[_type == "address" && email == $email]`,
        { email: userEmail }
      );

      for (const address of existingAddresses) {
        await client.patch(address._id).set({ default: false }).commit();
      }
    }

    // Create new address
    const newAddress = await client.create({
      _type: "address",
      name: addressData.name,
      email: userEmail,
      address: addressData.address,
      city: addressData.city,
      state: addressData.state.toUpperCase(),
      zip: addressData.zip,
      default: addressData.isDefault || false,
      createdAt: new Date().toISOString(),
    });

    revalidatePath("/cart");
    return { success: true, addressId: newAddress._id };
  } catch (error) {
    console.error("Error creating address:", error);
    throw new Error("Failed to create address");
  }
}

export async function updateAddressForUser(
  addressId: string,
  addressData: CreateAddressData
) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      throw new Error("User not authenticated");
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Verify the address belongs to the user
    const existingAddress = await client.fetch(
      `*[_type == "address" && _id == $addressId && email == $email][0]`,
      { addressId, email: userEmail }
    );

    if (!existingAddress) {
      throw new Error("Address not found or unauthorized");
    }

    // If this is set as default, unset all other default addresses for this email
    if (addressData.isDefault) {
      const otherAddresses = await client.fetch(
        `*[_type == "address" && email == $email && _id != $addressId]`,
        { email: userEmail, addressId }
      );

      for (const address of otherAddresses) {
        await client.patch(address._id).set({ default: false }).commit();
      }
    }

    // Update the address
    await client
      .patch(addressId)
      .set({
        name: addressData.name,
        address: addressData.address,
        city: addressData.city,
        state: addressData.state.toUpperCase(),
        zip: addressData.zip,
        default: addressData.isDefault || false,
      })
      .commit();

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("Error updating address:", error);
    throw new Error("Failed to update address");
  }
}

export async function deleteAddressForUser(addressId: string) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      throw new Error("User not authenticated");
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Verify the address belongs to the user
    const existingAddress = await client.fetch(
      `*[_type == "address" && _id == $addressId && email == $email][0]`,
      { addressId, email: userEmail }
    );

    if (!existingAddress) {
      throw new Error("Address not found or unauthorized");
    }

    // Delete the address
    await client.delete(addressId);

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("Error deleting address:", error);
    throw new Error("Failed to delete address");
  }
}

// Cart simulation actions (since we're using Zustand for cart management)
// These could be extended to use a server-side cart in the future
export async function simulateAddToCart(item: CartItem) {
  // For now, this would be handled by client-side Zustand
  // But this structure allows for future server-side cart management
  return { success: true };
}

export async function getUserEmailFromClerk() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return null;
    }

    return user.emailAddresses[0]?.emailAddress || null;
  } catch (error) {
    console.error("Error getting user email:", error);
    return null;
  }
}
