/*
 * Tureng Neo promotion slot -- one of Tureng's conditions for publishing.
 * Tureng supplies the design and the destination link.
 *
 * Assets are bundled with the add-on rather than loaded from a remote server,
 * so opening the popup never contacts anyone. Changing the banner therefore
 * means shipping a new version.
 *
 * To enable: put the file(s) under /promo, fill in the fields, set enabled.
 * The popup is 420px wide; the banner renders at 400px wide, so supply 800px
 * wide artwork for sharp high-DPI display.
 */
var TurengPromo = {
  enabled: false,
  href: '',          // https:// link supplied by Tureng
  image: '',         // e.g. 'promo/tureng-neo.png'
  imageDark: '',     // optional variant shown in dark theme
  alt: 'Tureng Neo',
  text: ''           // text-only fallback when no image is supplied
};
