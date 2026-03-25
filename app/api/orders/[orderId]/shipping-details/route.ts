import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/client";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import { ensureCustomerCodeForUser } from "@/lib/customerCode";
import { syncAddressToAddressBook } from "@/lib/addressBookSync";

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const addressInput = payload?.address ?? payload?.shippingAddress;

    if (!addressInput || typeof addressInput !== "object") {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    const order = await writeClient.fetch(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id,
        status,
        email,
        address{
          name,
          email,
          contactEmail,
          lineId,
          phone,
          fax,
          company,
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
          type
        }
      }`,
      { orderId, clerkUserId: user.id }
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== ORDER_STATUSES.QUOTATION_REQUESTED) {
      return NextResponse.json(
        { error: "Shipping address can only be updated before approval." },
        { status: 400 }
      );
    }

    let ensuredCustomerCode = "";
    let sanityUserId: string | undefined;
    try {
      const ensured = await ensureCustomerCodeForUser({
        clerkUserId: user.id,
        email:
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          order.email ||
          "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phoneNumbers?.[0]?.phoneNumber,
      });
      ensuredCustomerCode = ensured.customerCode;
      sanityUserId = ensured.userId;
    } catch (error) {
      console.error("Failed to ensure customer code:", error);
    }

    const currentAddress = order.address || {};
    const nextAddress = {
      name:
        normalizeString(addressInput.name) ||
        normalizeString(currentAddress.name),
      email:
        normalizeString(addressInput.email) ||
        normalizeString(currentAddress.email) ||
        normalizeString(order.email),
      contactEmail:
        normalizeString(addressInput.contactEmail) ||
        normalizeString(addressInput.email) ||
        normalizeString(currentAddress.contactEmail) ||
        normalizeString(order.email),
      lineId:
        normalizeString(addressInput.lineId) ||
        normalizeString(currentAddress.lineId),
      phone:
        normalizeString(addressInput.phone) ||
        normalizeString(currentAddress.phone),
      fax:
        normalizeString(addressInput.fax) || normalizeString(currentAddress.fax),
      company:
        normalizeString(addressInput.company) ||
        normalizeString(currentAddress.company),
      customerCode:
        ensuredCustomerCode ||
        normalizeString(currentAddress.customerCode),
      taxId:
        normalizeString(addressInput.taxId) ||
        normalizeString(currentAddress.taxId),
      branch:
        normalizeString(addressInput.branch) ||
        normalizeString(currentAddress.branch),
      address:
        normalizeString(addressInput.address) ||
        normalizeString(currentAddress.address),
      city:
        normalizeString(addressInput.city) ||
        normalizeString(currentAddress.city),
      state:
        normalizeString(addressInput.state) ||
        normalizeString(currentAddress.state),
      zip:
        normalizeString(addressInput.zip) ||
        normalizeString(currentAddress.zip),
      country:
        normalizeString(addressInput.country) ||
        normalizeString(currentAddress.country),
      countryCode:
        normalizeString(addressInput.countryCode) ||
        normalizeString(currentAddress.countryCode),
      stateCode:
        normalizeString(addressInput.stateCode) ||
        normalizeString(currentAddress.stateCode),
      subArea:
        normalizeString(addressInput.subArea) ||
        normalizeString(currentAddress.subArea),
      type:
        normalizeString(addressInput.type) ||
        normalizeString(currentAddress.type) ||
        "home",
    };

    const requiredFields = [
      "name",
      "address",
      "city",
      "state",
      "zip",
      "country",
    ] as const;
    const missingFields = requiredFields.filter(
      (field) => !nextAddress[field]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required address fields",
          missingFields,
        },
        { status: 400 }
      );
    }

    const updatedOrder = await writeClient
      .patch(orderId)
      .set({
        address: nextAddress,
      })
      .commit();

    const userEmail =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      order.email ||
      "";
    if (userEmail) {
      try {
        await syncAddressToAddressBook({
          userEmail,
          sanityUserId,
          customerCode: ensuredCustomerCode,
          address: updatedOrder.address ?? nextAddress,
          previousAddress: currentAddress,
        });
      } catch (syncError) {
        console.error("Failed to sync shipping address to address book:", syncError);
      }
    }

    return NextResponse.json({
      success: true,
      address: updatedOrder.address,
    });
  } catch (error) {
    console.error("Error updating shipping address:", error);
    return NextResponse.json(
      { error: "Failed to update shipping address" },
      { status: 500 }
    );
  }
}
