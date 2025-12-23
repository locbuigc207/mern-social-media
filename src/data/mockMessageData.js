// src/data/mockMessageData.js

export const mockConversations = [
  {
    _id: "conv1",
    recipients: [
      {
        _id: "user1",
        fullname: "Nguyễn Văn A",
        username: "nguyenvana",
        avatar: "https://i.pravatar.cc/150?img=1",
      },
      {
        _id: "currentUser",
        fullname: "Tôi",
        username: "me",
        avatar: "https://i.pravatar.cc/150?img=10",
      },
    ],
    text: "Chào bạn, hẹn gặp lại nhé!",
    media: [],
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 phút trước
    unread: false,
  },
  {
    _id: "conv2",
    recipients: [
      {
        _id: "user2",
        fullname: "Trần Thị B",
        username: "tranthib",
        avatar: "https://i.pravatar.cc/150?img=5",
      },
      {
        _id: "currentUser",
        fullname: "Tôi",
        username: "me",
        avatar: "https://i.pravatar.cc/150?img=10",
      },
    ],
    text: "Bài tập hôm nay khó quá!",
    media: [],
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 phút trước
    unread: true,
  },
  {
    _id: "conv3",
    recipients: [
      {
        _id: "user3",
        fullname: "Lê Văn C",
        username: "levanc",
        avatar: "https://i.pravatar.cc/150?img=8",
      },
      {
        _id: "currentUser",
        fullname: "Tôi",
        username: "me",
        avatar: "https://i.pravatar.cc/150?img=10",
      },
    ],
    text: "Cảm ơn bạn nhiều nha!",
    media: [],
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 giờ trước
    unread: false,
  },
  {
    _id: "conv4",
    recipients: [
      {
        _id: "user4",
        fullname: "Phạm Thị D",
        username: "phamthid",
        avatar: "https://i.pravatar.cc/150?img=9",
      },
      {
        _id: "currentUser",
        fullname: "Tôi",
        username: "me",
        avatar: "https://i.pravatar.cc/150?img=10",
      },
    ],
    text: "",
    media: ["image1.jpg", "image2.jpg"],
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 giờ trước
    unread: true,
  },
  {
    _id: "conv5",
    recipients: [
      {
        _id: "user5",
        fullname: "Hoàng Văn E",
        username: "hoangvane",
        avatar: "https://i.pravatar.cc/150?img=12",
      },
      {
        _id: "currentUser",
        fullname: "Tôi",
        username: "me",
        avatar: "https://i.pravatar.cc/150?img=10",
      },
    ],
    text: "Ngày mai gặp nhau nhé!",
    media: [],
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 ngày trước
    unread: false,
  },
];

export const mockMessages = {
  user1: [
    {
      _id: "msg1",
      conversation: "conv1",
      sender: "user1",
      recipient: "currentUser",
      text: "Chào bạn!",
      media: [],
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
      _id: "msg2",
      conversation: "conv1",
      sender: "currentUser",
      recipient: "user1",
      text: "Chào bạn, có chuyện gì thế?",
      media: [],
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    },
    {
      _id: "msg3",
      conversation: "conv1",
      sender: "user1",
      recipient: "currentUser",
      text: "Chào bạn, hẹn gặp lại nhé!",
      media: [],
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ],
  user2: [
    {
      _id: "msg4",
      conversation: "conv2",
      sender: "user2",
      recipient: "currentUser",
      text: "Bài tập hôm nay khó quá!",
      media: [],
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ],
  user4 : [
    {
      _id: "msg10",
      conversation: "conv4",
      sender: "user4",
      recipient: "currentUser",
      text: "",
      media: ["image1.jpg", "image2.jpg"],
      isRead: false, 
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
  ]
};