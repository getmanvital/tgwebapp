import React from 'react';

type Props = {
  style?: React.CSSProperties;
  className?: string;
};

const HomeIcon: React.FC<Props> = ({ style, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={style}
    className={className}
    width="28"
    height="28"
  >
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

export default HomeIcon;



