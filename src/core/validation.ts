import type { EmbedDocument } from './types';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateEmbed(
  embed: EmbedDocument
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  function error(field: string, message: string) {
    issues.push({ field, message, severity: 'error' });
  }

  function warning(field: string, message: string) {
    issues.push({ field, message, severity: 'warning' });
  }

  function maxLength(
    field: string,
    value: string,
    maximum: number
  ) {
    if (value.length > maximum) {
      error(field, `Maximum ${maximum} characters; found ${value.length}.`);
    }
  }

  function checkUrl(field: string, value: string) {
    if (value && !validHttpUrl(value)) {
      error(field, 'Enter a valid HTTP or HTTPS URL.');
    }
  }

  maxLength('Title', embed.title, 256);
  maxLength('Description', embed.description, 4096);
  maxLength('Author', embed.authorName, 256);
  maxLength('Footer', embed.footer, 2048);

  checkUrl('Author URL', embed.authorUrl);
  checkUrl('Author icon', embed.authorIconUrl);
  checkUrl('Thumbnail', embed.thumbnailUrl);
  checkUrl('Image', embed.imageUrl);
  checkUrl('Footer icon', embed.footerIconUrl);

  if (embed.authorUrl && !embed.authorName) {
    warning('Author URL', 'An author name is required to use this URL.');
  }

  if (embed.authorIconUrl && !embed.authorName) {
    warning('Author icon', 'An author name is required to use this icon.');
  }

  if (embed.footerIconUrl && !embed.footer) {
    warning('Footer icon', 'Footer text is required to use this icon.');
  }

  if (embed.fields.length > 25) {
    error('Fields', 'Discord allows a maximum of 25 fields.');
  }

  embed.fields.forEach((field, index) => {
    const label = `Field ${index + 1}`;

    if (!field.name.trim()) {
      error(label, 'Field name cannot be empty.');
    }

    if (!field.value.trim()) {
      error(label, 'Field value cannot be empty.');
    }

    maxLength(`${label} name`, field.name, 256);
    maxLength(`${label} value`, field.value, 1024);
  });

  const totalCharacters =
    embed.title.length +
    embed.description.length +
    embed.authorName.length +
    embed.footer.length +
    embed.fields.reduce(
      (total, field) =>
        total + field.name.length + field.value.length,
      0
    );

  if (totalCharacters > 6000) {
    error(
      'Total characters',
      `Discord allows 6000 characters across all embeds in a message; this embed has ${totalCharacters}.`
    );
  }

  const hasContent = Boolean(
    embed.title ||
    embed.description ||
    embed.authorName ||
    embed.footer ||
    embed.fields.length ||
    embed.imageUrl ||
    embed.thumbnailUrl
  );

  if (!hasContent) {
    error('Embed', 'The embed needs some content.');
  }

  return issues;
}
