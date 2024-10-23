/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0658bd",
        secondary: "#10B981",
        lightGray: "#f3f4f6",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(to right, #10B981, #0658bd)",
      },
    },
  },
  plugins: [],
};
