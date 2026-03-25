import { currentUser } from "@clerk/nextjs/server";
import WishlistClient from "./WishlistClient";

const WishListPage = async () => {
  const user = await currentUser();

  return <WishlistClient isLoggedIn={Boolean(user)} />;
};

export default WishListPage;
