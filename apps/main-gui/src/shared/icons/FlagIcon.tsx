import React from 'react';

/* A country's flag, round, by its ISO 3166 code.
 *
 * The odd one out in this folder: every other wrapper hides a library, and
 * this one hides a directory. The flags are files -- `public/flags/us.svg`,
 * 256 of them, see docs/shared/flags.md -- so the glyph cannot be an import
 * and the contract cannot be `IconProps`: a flag is not one drawing, it is
 * one per country, and `code` is what picks it.
 *
 * `size` is a diameter rather than a side. The files are 4:3, so a round flag
 * has to lose something; `cover` takes it off the left and right edges, which
 * is where a flag can spare it and where every other round-flag set on the
 * web takes it from. */
export interface FlagIconProps {
	/* Two letters, either case: 'US', 'mx'. Six for the countries of Great
	 * Britain, as the files are named: 'GB-ENG'. */
	code: string;
	size?: number;
	/* What a reader with no eyes on the image is told. Leave it out when the
	 * flag sits beside the name it stands for -- which is the usual case, and
	 * why this is not required. */
	title?: string;
}

const FlagIconFactory: React.FC<FlagIconProps> = ({ code, size = 22, title }) => {
	return (
		<img
			src={`/flags/${code.toLowerCase()}.svg`}
			alt={title ?? ''}
			width={size}
			height={size}
			loading="lazy"
			style={{
				width : size,
				height : size,
				borderRadius : '50%',
				objectFit : 'cover',
				/* The flags of Japan and Poland are mostly white; without a rim
				 * they dissolve into card paper. */
				boxShadow : 'inset 0 0 0 1px rgba(0, 0, 0, 0.18)',
				flexShrink : 0
			}}
		/>
	);
};

export const FlagIcon: React.FC<FlagIconProps> = FlagIconFactory;
export default FlagIcon;
