import type { ImgHTMLAttributes } from 'react';

export type LogoProps = ImgHTMLAttributes<HTMLImageElement>;

export const BrandingLogo = ({ ...props }: LogoProps) => {
  return <img src="/kre8ivdocs-logo.png" alt="KRE8ivDocs" {...props} />;
};
