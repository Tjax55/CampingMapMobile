/**
 * Brand colors, pulled directly from the "Fc." app icon (see
 * assets/android-icon-foreground.png etc.) so the edit/form screens read as
 * the same brand as the icon rather than an unrelated green accent.
 */
export const BRAND = {
  /** The icon's oxblood background — primary action color (submit, save, approve). */
  oxblood: '#8C2B23',
  /** The icon's campfire watermark — a darker shade for pressed/emphasis states. */
  oxbloodDark: '#6E1F19',
  /** The icon's brass dot — used for selected/active toggle states. */
  brass: '#D8AE4E',
  /** The icon's cream lettering — light text on a dark/brand background. */
  cream: '#FDFBF6',
} as const
