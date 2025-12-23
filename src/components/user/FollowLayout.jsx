import { Outlet } from "react-router-dom";

export default function FollowLayout() {
  return (
    <div className="max-w-5xl mx-auto w-full pb-10">
      <Outlet />
    </div>
  );
}
