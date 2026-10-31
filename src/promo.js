/*
 * Tureng Neo promotion slot -- one of Tureng's conditions for publishing.
 * Tureng supplies the design and the destination links.
 *
 * Assets are bundled with the add-on rather than loaded from a remote server,
 * so opening the popup never contacts anyone. Changing the banner therefore
 * means shipping a new version.
 *
 * The banner renders 400px wide in the popup (artwork is 800x128 for high-DPI).
 * `links` lays an invisible link over each region of the image, given as
 * [left, top, width, height] in percent of the banner. With a single `href`
 * instead, the whole banner is one link.
 */
var TurengPromo = {
  enabled: true,
  image: 'promo/tureng-neo.svg',
  imageDark: '',     // optional variant shown in dark theme
  alt: 'Tureng Neo',
  text: '',          // text-only fallback when no image is supplied
  href: '',          // single destination for the whole banner
  links: [
    // Measured from the artwork (800x128): App Store badge spans 619-784 x 14-56,
    // Google Play badge 621-783 x 65-111. Padded slightly, without overlapping.
    // Region-free App Store link: Apple redirects to the visitor's own storefront.
    { label: 'Tureng Neo — App Store',
      href: 'https://apps.apple.com/app/id6756741925',
      area: [77, 9, 21.5, 36.5] },
    { label: 'Tureng Neo — Google Play',
      href: 'https://play.google.com/store/apps/details?id=com.tureng.neo',
      area: [77, 49, 21.5, 40] }
  ]
};
