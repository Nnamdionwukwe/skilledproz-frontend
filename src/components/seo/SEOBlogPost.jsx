import { Helmet } from "react-helmet-async";

/**
 * SEO for Blog Posts
 * Optimized for article schema and rich snippets
 */
export default function SEOBlogPost({
  title,
  description,
  slug,
  author,
  publishedDate,
  modifiedDate,
  image,
  tags = [],
  category = null,
  readTime = null,
  excerpt = null,
}) {
  const canonical = `https://skilledproz.com/blog/${slug}`;
  const fullTitle = `${title} | SkilledProz Blog`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description,
    author: {
      "@type": "Person",
      name: author,
    },
    datePublished: publishedDate,
    dateModified: modifiedDate || publishedDate,
    image: image,
    url: canonical,
    publisher: {
      "@type": "Organization",
      name: "SkilledProz",
      logo: {
        "@type": "ImageObject",
        url: "https://skilledproz.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    keywords: tags.join(", "),
  };

  if (readTime) {
    structuredData.readTime = readTime;
  }

  if (category) {
    structuredData.articleSection = category;
  }

  if (excerpt) {
    structuredData.excerpt = excerpt;
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="author" content={author} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="article:published_time" content={publishedDate} />
      <meta
        property="article:modified_time"
        content={modifiedDate || publishedDate}
      />
      <meta property="article:author" content={author} />
      {category && <meta property="article:section" content={category} />}
      {tags.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@skilledproz" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <link rel="canonical" href={canonical} />
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}
