import React from 'react';
import { Helmet } from 'react-helmet';

// Default values
const defaultLogo = 'https://billbytekot.in/logo.png';
const defaultPhone = '+91-9353685739';
const defaultEmail = 'support@billbytekot.in';
const defaultAddress = {
  street: 'Your Street Address',
  city: 'City',
  state: 'State',
  postalCode: '110001',
  country: 'IN',
  area: ''
};

export const WebsiteSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://billbytekot.in/#website",
    "name": "BillByteKOT - Restaurant Billing & KOT Software",
    "url": "https://billbytekot.in/",
    "description": "India's leading restaurant billing software with KOT system, GST billing, and inventory management. Trusted by 500+ restaurants across India.",
    "potentialAction": [{
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://billbytekot.in/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }],
    "inLanguage": "en-IN",
    "publisher": {
      "@id": "https://billbytekot.in/#organization"
    },
    "copyrightHolder": {
      "@id": "https://billbytekot.in/#organization"
    },
    "copyrightYear": new Date().getFullYear(),
    "creator": {
      "@id": "https://billbytekot.in/#organization"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export const OrganizationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://billbytekot.in/#organization",
    "name": "BillByteKOT",
    "legalName": "BillByte Innovations",
    "url": "https://billbytekot.in/",
    "logo": {
      "@type": "ImageObject",
      "url": defaultLogo,
      "width": 600,
      "height": 60
    },
    "image": defaultLogo,
    "description": "India's leading restaurant billing software with KOT system, GST billing, and inventory management. Trusted by 500+ restaurants across India.",
    "foundingDate": "2023-01-01",
    "founders": [{
      "@type": "Person",
      "name": "Founder Name",
      "jobTitle": "CEO & Founder"
    }],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": defaultAddress.street,
      "addressLocality": defaultAddress.city,
      "addressRegion": defaultAddress.state,
      "postalCode": defaultAddress.postalCode,
      "addressCountry": defaultAddress.country
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "28.6139",
      "longitude": "77.2090"
    },
    "contactPoint": [{
      "@type": "ContactPoint",
      "contactType": "customer service",
      "telephone": defaultPhone,
      "email": defaultEmail,
      "contactOption": "TollFree",
      "availableLanguage": ["English", "Hindi"],
      "areaServed": ["IN"],
      "hoursAvailable": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
      }
    }],
    "sameAs": [
      "https://www.facebook.com/billbytekot",
      "https://twitter.com/billbytekot",
      "https://www.linkedin.com/company/billbytekot",
      "https://www.instagram.com/billbytekot",
      "https://www.youtube.com/@billbytekot",
      "https://in.pinterest.com/billbytekot/"
    ],
    "brand": {
      "@type": "Brand",
      "name": "BillByteKOT",
      "logo": defaultLogo,
      "description": "Restaurant Billing & KOT Software"
    },
    "taxID": "XXXXXXXXXXXXXX",
    "vatID": "XXXXXXXXXXXXXX",
    "foundingLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": defaultAddress.city,
        "addressRegion": defaultAddress.state,
        "addressCountry": defaultAddress.country
      }
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Restaurant Software Solutions",
      "itemListElement": [
        {
          "@type": "OfferCatalog",
          "name": "Billing Software",
          "itemListElement": [
            {
              "@type": "Product",
              "name": "Basic Plan",
              "description": "Essential billing features for small restaurants",
              "offers": {
                "@type": "Offer",
                "price": "999",
                "priceCurrency": "INR"
              }
            }
          ]
        }
      ]
    },
    "makesOffer": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Restaurant Billing Software",
          "description": "Complete billing solution for restaurants with GST support"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "KOT Management System",
          "description": "Kitchen Order Ticket system for efficient restaurant operations"
        }
      }
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export const BreadcrumbSchema = ({ items = [] }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url,
      ...(item.image && {
        "image": {
          "@type": "ImageObject",
          "url": item.image,
          "width": 100,
          "height": 100
        }
      })
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export const FAQSchema = ({ faqs = [] }) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
        ...(faq.author && {
          "author": {
            "@type": "Person",
            "name": faq.author
          }
        }),
        ...(faq.upvoteCount && { "upvoteCount": faq.upvoteCount }),
        ...(faq.dateCreated && { "dateCreated": faq.dateCreated }),
        ...(faq.video && {
          "video": {
            "@type": "VideoObject",
            "name": faq.video.name,
            "description": faq.video.description,
            "thumbnailUrl": faq.video.thumbnailUrl,
            "uploadDate": faq.video.uploadDate,
            "duration": faq.video.duration,
            "contentUrl": faq.video.contentUrl,
            "embedUrl": faq.video.embedUrl
          }
        })
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export const LocalBusinessSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": "https://billbytekot.in/#restaurant",
    "name": "BillByteKOT",
    "image": defaultLogo,
    "description": "Best restaurant billing software in India with FREE KOT system, thermal printing, GST billing & WhatsApp integration.",
    "priceRange": "â‚¹â‚¹",
    "servesCuisine": ["Indian", "Multi-cuisine"],
    "menu": "https://billbytekot.in/menu",
    "acceptsReservations": "True",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Your Street Address",
      "addressLocality": "City",
      "addressRegion": "State",
      "postalCode": "110001",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "28.6139",
      "longitude": "77.2090"
    },
    "telephone": defaultPhone,
    "email": defaultEmail,
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday"
        ],
        "opens": "09:00",
        "closes": "23:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Sunday",
        "opens": "10:00",
        "closes": "22:00"
      }
    ],
    "sameAs": [
      "https://www.facebook.com/billbytekot",
      "https://twitter.com/billbytekot"
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

