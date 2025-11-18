import React, { useEffect, useRef, useState } from 'react';
import styles from './ZoneBlock.module.scss';
import zones from './zones.json';

const ZoneBlock = () => {
  const mapRef = useRef(null);
  const [legend, setLegend] = useState([]);

  useEffect(() => {
    const legendItems = zones.features.map((feature) => {
      const desc = feature.properties.description || '';
      const [name, price] = desc.split(',').map((v) => v.trim());

      return {
        id: feature.id,
        name: name || 'Без названия',
        price: price || '0',
        color: feature.properties.fill || '#cccccc',
      };
    });

    setLegend(legendItems);
  }, []);

  useEffect(() => {
    if (!window.ymaps) return;

    window.ymaps.ready(() => {
      const map = new window.ymaps.Map(mapRef.current, {
        center: [52.033, 113.5],
        zoom: 12,
      });

      zones.features.forEach((feature) => {
        const rawCoords = feature.geometry.coordinates[0];
        const coords = rawCoords.map(([lng, lat]) => [lat, lng]);
        const p = feature.properties;

        const polygon = new window.ymaps.Polygon(
          [coords],
          { balloonContent: p.description || 'Нет данных' },
          {
            fillColor:
              p.fill +
              Math.floor((p['fill-opacity'] ?? 0.6) * 255)
                .toString(16)
                .padStart(2, '0'),
            fillOpacity: p['fill-opacity'] ?? 0.5,
            strokeColor: p.stroke || '#000000',
            strokeOpacity: p['stroke-opacity'] ?? 1,
            strokeWidth: Number(p['stroke-width'] ?? 2),
          },
        );

        map.geoObjects.add(polygon);
      });
    });
  }, []);

  return (
    <div className={styles.zoneBlock}>
      <div ref={mapRef} className={styles.mapContainer} />
      {/* Легенда над картой */}
      <div className={styles.legend}>
        {legend.map((item) => (
          <div key={item.id} className={styles.legendItem}>
            <div className={styles.colorBox} style={{ backgroundColor: item.color }} />
            <div className={styles.info}>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.price}>{item.price} ₽</span>
            </div>
          </div>
        ))}
      </div>
      {/* Карта */}
    </div>
  );
};

export default ZoneBlock;
