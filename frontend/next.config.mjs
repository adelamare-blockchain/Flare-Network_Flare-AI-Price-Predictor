/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MISTRAL_AI_PRIVATE_KEY:
      process.env.NEXT_PUBLIC_MISTRAL_AI_PRIVATE_KEY,
    NEXT_PUBLIC_CONTRACT_ADDRESS:
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  },
};

export default nextConfig;
