"use client";

import Container from "@/components/Container";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import WishlistProducts from "@/components/WishlistProducts";
import WishlistHeader from "@/components/wishlist/WishlistHeader";
import WishlistNoAccess from "@/components/wishlist/WishlistNoAccess";

type WishlistClientProps = {
  isLoggedIn: boolean;
};

const WishlistClient = ({ isLoggedIn }: WishlistClientProps) => {
  return (
    <Container className="py-6">
      <DynamicBreadcrumb />
      <WishlistHeader />
      {isLoggedIn ? <WishlistProducts /> : <WishlistNoAccess />}
    </Container>
  );
};

export default WishlistClient;
