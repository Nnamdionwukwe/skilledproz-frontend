import { Helmet } from "react-helmet-async";

/**
 * SEO Component for SkilledProz
 * Manages meta tags, structured data, and Open Graph for better search visibility
 */
export default function SEO({
  title = "Hire Verified Workers & Skilled Trades in Nigeria | SkilledProz",
  description = "Find trusted electricians, plumbers, carpenters, and skilled workers. Verified profiles, escrow payments, GPS tracking, and dispute resolution. Join 500+ early adopters.",
  keywords = "hire workers, skilled trades, verified professionals, Nigeria, gig economy, plumber, electrician, carpenter, freelance work, escrow payments",
  canonical = "https://skilledproz.com",
  ogImage = "https://skilledproz.com/og-image.jpg",
  ogType = "website",
  twitterCard = "summary_large_image",
  twitterSite = "@skilledproz",
  author = "SkilledProz",
  publishedDate = null,
  modifiedDate = null,
  articleSection = null,
  tags = [],
  noIndex = false,
  noFollow = false,
  children = null,
}) {
  // Construct the title with brand
  const fullTitle = title.includes("SkilledProz")
    ? title
    : `${title} | SkilledProz`;

  // Build meta tags
  const metaTags = [
    // Standard SEO
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { name: "author", content: author },
    {
      name: "robots",
      content: `${noIndex ? "noindex" : "index"}, ${noFollow ? "nofollow" : "follow"}`,
    },

    // Open Graph / Facebook
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: canonical },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "SkilledProz" },
    { property: "og:locale", content: "en_NG" },

    // Twitter
    { name: "twitter:card", content: twitterCard },
    { name: "twitter:site", content: twitterSite },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },

    // Additional
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    { name: "theme-color", content: "#f59e0b" },
  ];

  // Add article-specific meta tags
  if (publishedDate) {
    metaTags.push({
      property: "article:published_time",
      content: publishedDate,
    });
  }
  if (modifiedDate) {
    metaTags.push({ property: "article:modified_time", content: modifiedDate });
  }
  if (articleSection) {
    metaTags.push({ property: "article:section", content: articleSection });
  }
  if (tags.length > 0) {
    tags.forEach((tag) => {
      metaTags.push({ property: "article:tag", content: tag });
    });
  }

  // Build JSON-LD Structured Data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SkilledProz",
    url: "https://skilledproz.com",
    logo: "https://skilledproz.com/logo.png",
    description: description,
    sameAs: [
      "https://twitter.com/skilledproz",
      "https://linkedin.com/company/skilledproz",
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "NG",
    },
  };

  // If it's an article, add Article schema
  if (articleSection && publishedDate) {
    structuredData["@type"] = "Article";
    structuredData.headline = title;
    structuredData.datePublished = publishedDate;
    structuredData.dateModified = modifiedDate || publishedDate;
    structuredData.author = {
      "@type": "Person",
      name: author,
    };
  }

  // If it's a product/service page, add Product schema
  if (ogType === "product") {
    structuredData["@type"] = "Product";
    structuredData.name = title;
    structuredData.description = description;
    structuredData.image = ogImage;
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>

      {/* Meta Tags */}
      {metaTags.map((tag, index) => (
        <meta key={index} {...tag} />
      ))}

      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* Language */}
      <html lang="en" />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      {/* Additional custom content */}
      {children}
    </Helmet>
  );
}
