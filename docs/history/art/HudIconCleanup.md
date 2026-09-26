# 底部圖示質感簡化

內建 imagegen 編輯，保留原圖與生成透明通道。前進卡、立繪和頭髮未改。沒有改尺寸、間距、圖層順序、功能或動畫。

- `assets/ui/action-soulflame-v2.png`：魂火改用大色塊，減少碎白光與筆刷紋；同步引用於行動列、卡牌費用、測試按鈕。
- `assets/ui/hourglass-v2.png`：沙漏移除細雕花、砂粒與斑駁金屬紋，保留玻璃、流沙和金棕色框架。

## 魂火提示

Use case: style-transfer. Input image is the edit target: blue soul-flame game action-point icon. Preserve its silhouette, proportions, rounded bottom and three flame tips, main tip curving toward the upper right, single icon. Redraw ONLY its rendering style to match clean hand-drawn cel-shaded fantasy game icons. Genuine transparent background, tightly framed exactly like input, complete silhouette. Use a clear dark navy-blue contour, medium sapphire blue body, one broad cyan interior flame shape, and a small pale blue core. Just 3-4 broad coherent flat color regions; smooth clean contours, no brush grain or mottled pixels. Reduce neon saturation and eliminate blinding white bloom while retaining very clear bright blue readability at 28px against dark green and cream backgrounds. No glossy candy reflections, no specular white spots, no external aura, no faces, eyes, symbols, letters, numbers, frame or additional flames. This remains a cute blue soul-fire, not a water drop or a flat geometric logo.

## 沙漏提示

Use case: style-transfer. Image 1 is the edit target, a fantasy game hourglass end-turn button. Preserve exactly its upright silhouette, aspect ratio, framing, two side posts, top and bottom gold bands, two glass bulbs, sand proportions and falling central sand stream. Genuine transparent background. Restyle as a clean hand-drawn anime fantasy icon with dark brown outlines and large calm cel-shaded areas, matching simple illustrated game cards. Gold metal with just one broad highlight and shadow, brown wood posts WITHOUT carved floral patterns or wood-grain texture, clear pale blue-gray glass with a single simple reflection each side, solid warm golden sand as two simple masses. No individual sand grains, no grit, no distressed metal, no texture flecks, no tiny details, no glow, no text, no frame or additional objects. The narrow falling sand stream remains continuous and clearly readable. Make the glass and sand clearly legible at 40px height on a dark forest background. Complete object with same tight margins as reference.
