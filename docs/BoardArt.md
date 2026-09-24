# 森林遺跡棋盤地板

`assets/tiles/ForestFloorPainted.png` 是以內建 imagegen 生成的俯視石地與藤蔓圖片。戰鬥畫面的精確 5×5 格線由 `src/battleBoard.css` 繪製在圖片上方，因此圖片本身不含格線。

## 生成提示詞

```text
Use case: stylized-concept
Asset type: square 2D tactical game board floor texture, to sit beneath a precise 5 by 5 UI grid
Primary request: hand-painted forest ruins stone floor with a few naturally growing thin green vines and small leaves creeping in from corners and along some edges
Scene/backdrop: old pale sage-gray stone ground in a forest ruin
Style/medium: polished hand-painted fantasy game environment texture, soft brushwork, restrained detail, matching a cozy anime storybook forest setting
Composition/framing: perfectly straight top-down orthographic view, square canvas, uniform scale and lighting across the full image; no perspective or horizon; sparse vines scattered asymmetrically across the floor, each small enough not to obscure a character standing in a board cell
Color palette: muted sage gray stone and moss green; medium-light overall value so red danger highlights and green movement highlights remain legible
Constraints: make one continuous floor surface with no visible grid, no tile borders, no irregular paving outlines, no characters, no monsters, no UI markers, no text, no watermark; the game draws its exact square grid separately on top
```
