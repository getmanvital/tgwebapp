import React from 'react';

type Props = {
  style?: React.CSSProperties;
  className?: string;
};

const CheckIcon: React.FC<Props> = ({ style, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={style}
    className={className}
    width="28"
    height="28"
  >
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

export default CheckIcon;



