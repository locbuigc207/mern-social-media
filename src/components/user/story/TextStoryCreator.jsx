// src/components/story/TextStoryCreator.jsx
import { useState } from "react";
import { FiX, FiType, FiAlignLeft, FiAlignCenter, FiAlignRight } from "react-icons/fi";

const BACKGROUNDS = [
  { id: 1, gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: 2, gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: 3, gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { id: 4, gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { id: 5, gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { id: 6, gradient: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
  { id: 7, gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
  { id: 8, gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" },
];

const FONT_SIZES = [
  { label: "Nhỏ", value: "text-2xl" },
  { label: "Vừa", value: "text-4xl" },
  { label: "Lớn", value: "text-5xl" },
];

export default function TextStoryCreator({ onClose, onCreateTextStory }) {
  const [text, setText] = useState("");
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [fontSize, setFontSize] = useState(FONT_SIZES[1]);
  const [textAlign, setTextAlign] = useState("center");

  const handleCreate = () => {
    if (!text.trim()) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    // Parse gradient colors (simplified)
    const colors = background.gradient.match(/#[0-9a-f]{6}/gi);
    if (colors && colors.length >= 2) {
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Draw text
    ctx.fillStyle = "white";
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";
    
    // Font size mapping
    const fontSizeMap = {
      "text-2xl": 80,
      "text-4xl": 120,
      "text-5xl": 160,
    };
    ctx.font = `bold ${fontSizeMap[fontSize.value]}px Arial`;

    // Word wrap
    const maxWidth = 900;
    const lineHeight = fontSizeMap[fontSize.value] * 1.2;
    const x = textAlign === "center" ? 540 : textAlign === "left" ? 90 : 990;
    let y = 960;

    const words = text.split(" ");
    let line = "";
    const lines = [];

    for (let word of words) {
      const testLine = line + word + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== "") {
        lines.push(line);
        line = word + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Center vertically
    y = (1920 - lines.length * lineHeight) / 2;

    lines.forEach((line) => {
      ctx.fillText(line.trim(), x, y);
      y += lineHeight;
    });

    // Convert to blob
    canvas.toBlob((blob) => {
      onCreateTextStory(blob, background.gradient);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Tạo tin văn bản</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="flex">
          {/* Preview */}
          <div className="w-1/2 p-4">
            <div
              className="w-full aspect-9/16 rounded-lg overflow-hidden flex items-center justify-center p-8"
              style={{ background: background.gradient }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nhập văn bản..."
                maxLength={200}
                className={`w-full bg-transparent text-white placeholder-white/50 outline-none resize-none ${fontSize.value} font-bold text-${textAlign}`}
                style={{ textAlign }}
                rows={6}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="w-1/2 p-4 space-y-4">
            {/* Backgrounds */}
            <div>
              <label className="block text-sm font-semibold mb-2">Nền</label>
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBackground(bg)}
                    className={`w-full aspect-square rounded-lg ${
                      background.id === bg.id ? "ring-4 ring-blue-500" : ""
                    }`}
                    style={{ background: bg.gradient }}
                  />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-semibold mb-2">Kích thước chữ</label>
              <div className="flex gap-2">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      fontSize.value === size.value
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Align */}
            <div>
              <label className="block text-sm font-semibold mb-2">Căn chỉnh</label>
              <div className="flex gap-2">
                {[
                  { icon: FiAlignLeft, value: "left" },
                  { icon: FiAlignCenter, value: "center" },
                  { icon: FiAlignRight, value: "right" },
                ].map(({ icon: Icon, value }) => (
                  <button
                    key={value}
                    onClick={() => setTextAlign(value)}
                    className={`flex-1 p-3 rounded-lg border flex items-center justify-center ${
                      textAlign === value
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Icon className="text-xl" />
                  </button>
                ))}
              </div>
            </div>

            {/* Character Count */}
            <p className="text-sm text-gray-500 text-right">{text.length}/200</p>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={!text.trim()}
              className={`w-full py-3 rounded-lg font-bold text-white ${
                text.trim()
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Tạo story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}