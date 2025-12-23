// src/data/mockPosts.js
const currentUser = {
  _id: "me",
  fullname: "Bạn",
  avatar: "https://i.pravatar.cc/150?img=5",
};

const otherUsers = [
  {
    _id: "u1",
    fullname: "Nguyễn Văn A",
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    _id: "u2",
    fullname: "Trần Thị B",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    _id: "u3",
    fullname: "Lê Văn C",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
];

const generateMockPosts = (count) => {
  const posts = [];

  // THÊM 2 BÀI CỦA "me" TRƯỚC
  posts.push({
    _id: "post-me-1",
    content: "Chào mọi người! Đây là bài viết đầu tiên của tôi 😊",
    images: ["https://picsum.photos/600/400?random=me1"],
    user: currentUser,
    likes: ["u1", "u2"],
    comments: [{ _id: "c1", content: "Chào bạn!", user: otherUsers[0] }],
    createdAt: new Date().toISOString(),
  });

  posts.push({
    _id: "post-me-2",
    content: "Ai đi cà phê không? ☕",
    images: [],
    user: currentUser,
    likes: ["u3"],
    comments: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  });

  // THÊM BÀI CỦA NGƯỜI KHÁC
  for (let i = 0; i < count - 2; i++) {
    const user = otherUsers[i % 3];
    const hasImage = i % 2 === 0;
    posts.push({
      _id: `post-${i + 1}`,
      content: `Bài viết số ${i + 1} – Nội dung mẫu để test!`,
      images: hasImage ? [`https://picsum.photos/600/400?random=${i}`] : [],
      user,
      likes: Array.from(
        { length: Math.floor(Math.random() * 10) },
        () => `u${i}`
      ),
      comments:
        i % 3 === 0
          ? [{ _id: `c${i}-1`, content: "Hay!", user: otherUsers[(i + 1) % 3] }]
          : [],
      createdAt: new Date(Date.now() - (i + 2) * 3600000).toISOString(),
    });
  }

  return posts;
};

export const mockPosts = generateMockPosts(10);
export { currentUser }; // ← XUẤT RA ĐỂ DÙNG Ở PostCard
