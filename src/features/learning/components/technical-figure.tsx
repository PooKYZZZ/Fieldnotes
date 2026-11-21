type TechnicalFigureSource = {
  label: string;
  url: string;
  license: string;
  licenseUrl: string;
};

export function TechnicalFigure({
  src,
  alt,
  caption,
  source,
  width = 960,
  height = 360,
}: {
  src: string;
  alt: string;
  caption: string;
  source?: TechnicalFigureSource;
  width?: number;
  height?: number;
}) {
  if (!src.startsWith("/diagrams/") || src.startsWith("//")) {
    throw new Error("Learning diagrams must use a same-origin asset under /diagrams/.");
  }
  if (source && (!source.url.startsWith("https://") || !source.licenseUrl.startsWith("https://"))) {
    throw new Error("Learning figure source and license links must use HTTPS.");
  }

  return (
    <figure className="learning-figure">
      {/* Reviewed local assets keep working without a network connection. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
      <figcaption>
        <span className="learning-figure-caption-text">{caption}</span>
        <a className="learning-figure-attribution" href={src} target="_blank" rel="noreferrer">Open full-size figure</a>
        {source && (
          <span className="learning-figure-attribution">
            Source: <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
            {" · "}
            <a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
