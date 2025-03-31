import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 프로덕션 빌드 중 ESLint 오류 무시
    ignoreDuringBuilds: true,
  },
  // 정적 내보내기(export) 설정
  output: "export",
  trailingSlash: true,
  // GitHub Pages 배포 시, 리포지토리 이름과 일치하는 basePath 지정
  basePath: "/BTViz-web",
};

export default nextConfig;
