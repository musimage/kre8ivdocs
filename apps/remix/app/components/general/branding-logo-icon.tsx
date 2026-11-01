import type { ImgHTMLAttributes } from 'react';

export type LogoProps = ImgHTMLAttributes<HTMLImageElement>;

export const BrandingLogoIcon = ({ ...props }: LogoProps) => {
  return <img src="/kre8ivdocs-icon.png" alt="KRE8ivDocs" {...props} />;
};
