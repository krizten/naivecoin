const hexToBinary = (hex: string): string => {
  return parseInt(hex, 16).toString(2).padStart(8, "0");
};

export { hexToBinary };
