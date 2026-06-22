/**
 * Title block for game hub pages (badge lives in GamesHubNavBar).
 * @param {{ title: string, subtitle: string, titleClass: string, subtitleClass: string, className?: string }} props
 */
export default function GamesHubHeader({ title, subtitle, titleClass, subtitleClass, className = "" }) {
  return (
    <header className={`text-center space-y-2 mb-4 md:mb-6 ${className}`}>
      {title ? <h1 className={titleClass}>{title}</h1> : null}
      <p className={subtitleClass}>{subtitle}</p>
    </header>
  );
}
