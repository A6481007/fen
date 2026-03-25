"use client";

import Container from "@/components/Container";
import AddressBookClient from "@/components/addresses/AddressBookClient";
import AccountAddressesHeader from "@/components/account/AccountAddressesHeader";

type AddressBookPageClientProps = {
  userEmail: string;
};

const AddressBookPageClient = ({ userEmail }: AddressBookPageClientProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink/20">
      <Container className="py-6">
        <div className="space-y-6">
          <AccountAddressesHeader />
          <AddressBookClient userEmail={userEmail} />
        </div>
      </Container>
    </div>
  );
};

export default AddressBookPageClient;
