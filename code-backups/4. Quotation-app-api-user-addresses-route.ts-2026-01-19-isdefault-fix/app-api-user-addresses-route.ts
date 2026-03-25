import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import type { Address } from "@/lib/address";

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userEmail =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Fetch addresses for this user by email
    const addresses = await backendClient.fetch(
      `*[_type == "address" && email == $email] | order(default desc, createdAt desc) {
        _id,
        name,
        email,
        phone,
        fax,
        contactEmail,
        company,
        office,
        customerCode,
        taxId,
        branch,
        address,
        city,
        state,
        zip,
        country,
        countryCode,
        stateCode,
        subArea,
        default,
        type,
        createdAt,
        lastUsedAt
      }`,
      { email: userEmail }
    );

    return NextResponse.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const userEmail =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as Partial<Address>;

    // Validate required fields
    const trimmedName = (body.name || "").trim();
    const trimmedAddress = (body.address || "").trim();
    const trimmedCity = (body.city || "").trim();
    const trimmedState = (body.state || "").trim();
    const trimmedZip = (body.zip || "").trim();
    const trimmedCountry = (body.country || "").trim();
    const trimmedType = (body.type || "").trim();

    if (
      !trimmedName ||
      !trimmedAddress ||
      !trimmedCity ||
      !trimmedState ||
      !trimmedZip ||
      !trimmedCountry ||
      !trimmedType
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const addressPayload: Address = {
      _id: body._id,
      name: trimmedName,
      email: userEmail,
      contactEmail:
        normalizeOptionalString(body.contactEmail) || userEmail || "",
      phone: normalizeOptionalString(body.phone),
      fax: normalizeOptionalString(body.fax),
      company: normalizeOptionalString(body.company),
      office: normalizeOptionalString(body.office),
      customerCode: normalizeOptionalString(body.customerCode),
      taxId: normalizeOptionalString(body.taxId),
      branch: normalizeOptionalString(body.branch),
      address: trimmedAddress,
      city: trimmedCity,
      state: trimmedState,
      zip: trimmedZip,
      country: trimmedCountry,
      countryCode: normalizeOptionalString(body.countryCode),
      stateCode: normalizeOptionalString(body.stateCode),
      subArea: normalizeOptionalString(body.subArea),
      type: trimmedType as Address["type"],
      default: Boolean(body.default),
      createdAt: body.createdAt,
      lastUsedAt: body.lastUsedAt,
    };

    // First, ensure the user exists in Sanity
    let sanityUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
      { clerkUserId: userId }
    );

    if (!sanityUser) {
      sanityUser = await backendClient.fetch(
        `*[_type == "user" && email == $email][0]`,
        { email: userEmail }
      );
    }

    if (!sanityUser) {
      // Create user if doesn't exist
      sanityUser = await backendClient.create({
        _type: "user",
        clerkUserId: userId,
        email: userEmail,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        createdAt: new Date().toISOString(),
      });
    } else {
      const updates: Record<string, string> = {};
      if (sanityUser.clerkUserId !== userId) {
        updates.clerkUserId = userId;
      }
      if (sanityUser.email !== userEmail) {
        updates.email = userEmail;
      }
      if (user.firstName && sanityUser.firstName !== user.firstName) {
        updates.firstName = user.firstName;
      }
      if (user.lastName && sanityUser.lastName !== user.lastName) {
        updates.lastName = user.lastName;
      }
      if (Object.keys(updates).length > 0) {
        sanityUser = await backendClient
          .patch(sanityUser._id)
          .set(updates)
          .commit();
      }
    }

    // If this is set as default, unset all other default addresses for this user
    if (isDefault) {
      const existingAddresses = await backendClient.fetch(
        `*[_type == "address" && email == $email && default == true]`,
        { email: userEmail }
      );

      await Promise.all(
        existingAddresses.map((existingAddress: { _id: string }) =>
          backendClient
            .patch(existingAddress._id)
            .set({ default: false })
            .commit()
        )
      );
    }

    // Create new address
    const newAddress = await backendClient.create({
      _type: "address",
      name: addressPayload.name,
      email: addressPayload.email,
      address: addressPayload.address,
      city: addressPayload.city,
      state: addressPayload.state,
      zip: addressPayload.zip,
      country: addressPayload.country,
      countryCode: addressPayload.countryCode ?? "",
      stateCode: addressPayload.stateCode ?? "",
      subArea: addressPayload.subArea ?? "",
      default: addressPayload.default ?? false,
      type: addressPayload.type ?? "home",
      phone: addressPayload.phone ?? null,
      fax: addressPayload.fax ?? null,
      contactEmail: addressPayload.contactEmail ?? addressPayload.email ?? null,
      company: addressPayload.company ?? null,
      office: addressPayload.office ?? null,
      customerCode: addressPayload.customerCode ?? null,
      taxId: addressPayload.taxId ?? null,
      branch: addressPayload.branch ?? null,
      user: {
        _type: "reference",
        _ref: sanityUser._id,
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      address: newAddress,
    });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Partial<Address>;

    if (!body._id) {
      return NextResponse.json(
        { error: "Address ID is required for update" },
        { status: 400 }
      );
    }

    // Validate required fields
    const trimmedName = (body.name || "").trim();
    const trimmedAddress = (body.address || "").trim();
    const trimmedCity = (body.city || "").trim();
    const trimmedState = (body.state || "").trim();
    const trimmedZip = (body.zip || "").trim();
    const trimmedCountry = (body.country || "").trim();
    const trimmedType = (body.type || "").trim();

    if (
      !trimmedName ||
      !trimmedAddress ||
      !trimmedCity ||
      !trimmedState ||
      !trimmedZip ||
      !trimmedCountry ||
      !trimmedType
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const userEmail =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const existingAddress = await backendClient.fetch(
      `*[_type == "address" && _id == $id && email == $email][0]`,
      { id: body._id, email: userEmail }
    );

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found or access denied" },
        { status: 404 }
      );
    }

    // If this is set as default, unset all other default addresses for this user
    if (body.default) {
      const existingAddresses = await backendClient.fetch(
        `*[_type == "address" && email == $email && default == true && _id != $currentId]`,
        { email: userEmail, currentId: body._id }
      );

      await Promise.all(
        existingAddresses.map((address: { _id: string }) =>
          backendClient.patch(address._id).set({ default: false }).commit()
        )
      );
    }

    // Update the address
    const addressPayload: Address = {
      _id: body._id,
      name: trimmedName,
      email: userEmail,
      contactEmail:
        normalizeOptionalString(body.contactEmail) || userEmail || "",
      phone: normalizeOptionalString(body.phone),
      fax: normalizeOptionalString(body.fax),
      company: normalizeOptionalString(body.company),
      office: normalizeOptionalString(body.office),
      customerCode: normalizeOptionalString(body.customerCode),
      taxId: normalizeOptionalString(body.taxId),
      branch: normalizeOptionalString(body.branch),
      address: trimmedAddress,
      city: trimmedCity,
      state: trimmedState,
      zip: trimmedZip,
      country: trimmedCountry,
      countryCode: normalizeOptionalString(body.countryCode),
      stateCode: normalizeOptionalString(body.stateCode),
      subArea: normalizeOptionalString(body.subArea),
      type: trimmedType as Address["type"],
      default: Boolean(body.default),
      createdAt: body.createdAt,
      lastUsedAt: body.lastUsedAt,
    };

    const updatedAddress = await backendClient
      .patch(body._id)
      .set({
        name: addressPayload.name,
        address: addressPayload.address,
        city: addressPayload.city,
        state: addressPayload.state,
        zip: addressPayload.zip,
        country: addressPayload.country,
        countryCode: addressPayload.countryCode ?? "",
        stateCode: addressPayload.stateCode ?? "",
        subArea: addressPayload.subArea ?? "",
        default: addressPayload.default ?? false,
        type: addressPayload.type ?? "home",
        phone: addressPayload.phone ?? null,
        fax: addressPayload.fax ?? null,
        contactEmail: addressPayload.contactEmail ?? addressPayload.email ?? null,
        company: addressPayload.company ?? null,
        office: addressPayload.office ?? null,
        customerCode: addressPayload.customerCode ?? null,
        taxId: addressPayload.taxId ?? null,
        branch: addressPayload.branch ?? null,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      address: updatedAddress,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      {
        error: "Failed to update address",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    let addressId = searchParams.get("id");

    if (!addressId) {
      try {
        const body = await request.json();
        addressId = body?.id || body?.addressId || null;
      } catch {
        addressId = null;
      }
    }

    if (!addressId) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    const userEmail =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const existingAddress = await backendClient.fetch(
      `*[_type == "address" && _id == $id && email == $email][0]`,
      { id: addressId, email: userEmail }
    );

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the address
    await backendClient.delete(addressId);

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
