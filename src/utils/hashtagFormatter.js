// src/utils/hashtagFormatter.js
import { Link } from 'react-router-dom';

/**
 * Format text with clickable hashtags
 * @param {string} text - Text containing hashtags
 * @returns {JSX.Element} - Formatted text with clickable hashtags
 */
export function formatTextWithHashtags(text) {
  if (!text) return null;

  // Regex to match hashtags (# followed by alphanumeric characters)
  const hashtagRegex = /#(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    // Add text before hashtag
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add clickable hashtag
    const tag = match[1];
    parts.push(
      <Link
        key={`${match.index}-${tag}`}
        to={`/hashtag/${tag}`}
        className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        #{tag}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}

/**
 * Extract hashtags from text
 * @param {string} text - Text to extract hashtags from
 * @returns {string[]} - Array of hashtag strings (without #)
 */
export function extractHashtags(text) {
  if (!text) return [];
  
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }
  
  return hashtags;
}

/**
 * Count hashtags in text
 * @param {string} text
 * @returns {number}
 */
export function countHashtags(text) {
  return extractHashtags(text).length;
}

// Usage in PostCard.jsx:
// import { formatTextWithHashtags } from '../../utils/hashtagFormatter';
//
// <p className="text-gray-800 whitespace-pre-wrap">
//   {formatTextWithHashtags(post.content)}
// </p>