import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar, type AvatarSize } from '@/shared/ui/Avatar';
import { GalleryBlock } from '@/shared/ui/gallery/GalleryBlock';
import { PriceTag, type PriceTagSize } from '@/shared/ui/PriceTag';
import { Rating, type RatingSize } from '@/shared/ui/Rating';

const AVATAR_SIZES: readonly AvatarSize[] = ['sm', 'md', 'lg', 'xl'];
const PRICE_SIZES: readonly PriceTagSize[] = ['sm', 'md', 'lg'];
const RATING_SIZES: readonly RatingSize[] = ['sm', 'md', 'lg'];
const SAMPLE_PRICE_UZS = 250_000;
const SAMPLE_DISCOUNT_UZS = 199_000;
const SAMPLE_RATING = 4.5;

/** Avatar (initials, placeholder, sizes), PriceTag (sizes, old price) and Rating. */
export function MediaSection() {
  const { t } = useTranslation();
  const [rating, setRating] = useState(3);
  const name = t('ui.gallery.samples.userName');
  const avatarLabel = t('ui.avatar.initialsLabel', { name });
  const perMonth = t('ui.priceTag.perMonth');

  return (
    <>
      <GalleryBlock label={t('ui.gallery.labels.initials')}>
        {AVATAR_SIZES.map((size) => (
          <Avatar key={size} size={size} name={name} accessibilityLabel={avatarLabel} />
        ))}
        <Avatar size="lg" accessibilityLabel={t('ui.gallery.labels.placeholder')} />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.sizes')} direction="column">
        {PRICE_SIZES.map((size) => (
          <PriceTag key={size} size={size} amountUzs={SAMPLE_PRICE_UZS} period={perMonth} />
        ))}
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.oldPrice')}>
        <PriceTag
          amountUzs={SAMPLE_DISCOUNT_UZS}
          oldAmountUzs={SAMPLE_PRICE_UZS}
          period={perMonth}
        />
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.readOnly')}>
        {RATING_SIZES.map((size) => (
          <Rating
            key={size}
            size={size}
            value={SAMPLE_RATING}
            readOnly
            accessibilityLabel={t('ui.rating.label', { value: SAMPLE_RATING })}
          />
        ))}
      </GalleryBlock>
      <GalleryBlock label={t('ui.gallery.labels.interactive')}>
        <Rating
          size="lg"
          value={rating}
          onChange={setRating}
          accessibilityLabel={t('ui.rating.label', { value: rating })}
        />
      </GalleryBlock>
    </>
  );
}
