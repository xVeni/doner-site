import React from 'react';
import ContentLoader from 'react-content-loader';

const Skeleton = () => (
  <ContentLoader
    speed={2}
    width={300}
    height={360}
    viewBox="0 0 300 360"
    backgroundColor="#f3f3f3"
    foregroundColor="#ecebeb">
    {/* Изображение */}
    <rect x="0" y="0" rx="20" ry="20" width="300" height="180" />

    {/* Название */}
    <rect x="16" y="195" rx="4" ry="4" width="180" height="18" />

    {/* Вес */}
    <rect x="16" y="220" rx="4" ry="4" width="60" height="14" />

    {/* Описание */}
    <rect x="16" y="245" rx="4" ry="4" width="260" height="12" />
    <rect x="16" y="260" rx="4" ry="4" width="220" height="12" />

    {/* Цена */}
    <rect x="16" y="290" rx="4" ry="4" width="80" height="20" />

    {/* Кнопка */}
    <rect x="200" y="280" rx="8" ry="8" width="80" height="36" />
  </ContentLoader>
);

export default Skeleton;
