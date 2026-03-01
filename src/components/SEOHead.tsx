import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: string;
}

const DOMAIN = 'https://www.fromfarmersmarkets.com';

export const SEOHead = ({
  title = 'Find Local Farmers Markets | Support Small Businesses',
  description = 'Support small businesses by shopping from farmers markets across the US — not just the ones near you.',
  path = '/',
  image = '/og-image.png',
  type = 'website',
}: SEOHeadProps) => {
  const url = `${DOMAIN}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${DOMAIN}${image}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
};
