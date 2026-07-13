const ChatBotIcon = () => {
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <circle cx="128" cy="128" r="118" fill="#2563EB" />

      {/* Robot Head */}
      <rect
        x="68"
        y="60"
        width="120"
        height="100"
        rx="18"
        fill="white"
      />

      {/* Eyes */}
      <circle cx="100" cy="105" r="10" fill="#2563EB" />
      <circle cx="156" cy="105" r="10" fill="#2563EB" />

      {/* Smile */}
      <path
        d="M95 132 Q128 152 161 132"
        stroke="#2563EB"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />

      {/* Antenna */}
      <line
        x1="128"
        y1="60"
        x2="128"
        y2="35"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
      />

      <circle
        cx="128"
        cy="25"
        r="10"
        fill="#FACC15"
      />

      {/* Analytics Bars */}
      <rect
        x="82"
        y="176"
        width="18"
        height="36"
        rx="3"
        fill="white"
      />

      <rect
        x="118"
        y="156"
        width="18"
        height="56"
        rx="3"
        fill="white"
      />

      <rect
        x="154"
        y="136"
        width="18"
        height="76"
        rx="3"
        fill="white"
      />

      {/* Trend Line */}
      <polyline
        points="91,186 127,166 163,146"
        fill="none"
        stroke="#FACC15"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ChatBotIcon;