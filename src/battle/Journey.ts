import type { Loadout } from '../data/cards.ts';
import { Room, equal, type MoveAction } from './Room.ts';
import type { Point, RoomDefinition } from '../types/game.ts';
import { dungeons } from '../data/dungeons/index.ts';
import type { DungeonId } from '../data/dungeons/index.ts';
import type { CardId } from '../data/cards.ts';
import { freshBuild, canEngrave, engravingInfo, relicInfo, type Engraving, type CardRef } from './Growth.ts';
import { battleRewards, rewardOptions, type BattleReward } from './BattleRewards.ts';

export class Journey {
  readonly exit: Point = [2, 4];
  readonly dungeonId: DungeonId;
  stage = 0;
  assassination = 0;
  dawnCharge = 0;
  room: Room;
  private seed: number;
  private activeRooms: RoomDefinition[];
  loadout: Loadout;
  coins = 4;
  readonly builds = { basic: freshBuild(), qinghe: freshBuild(), rogue: freshBuild() };
  private rewardedStages = new Set<number>();
  private offeredRewards?: BattleReward[];
  private get ordinaryRewardCards() {
    return [...this.room.hand, ...this.room.deck, ...this.room.discard].filter(ref => !ref.includes('#'));
  }
  get pendingBattleReward() {
    return this.loadout === 'qinghe' && this.stage === 1 && this.room.won && !this.build.rewardClaimed && rewardOptions(this.seed, this.ordinaryRewardCards).length > 0;
  }
  get battleRewardOptions(): readonly BattleReward[] {
    if (!this.pendingBattleReward) return [];
    const available = rewardOptions(this.seed, this.ordinaryRewardCards);
    if (!this.offeredRewards?.some(id => available.includes(id))) this.offeredRewards = available;
    return this.offeredRewards!.filter(id => available.includes(id));
  }
  chooseBattleReward(reward: BattleReward) {
    if (!this.pendingBattleReward || !this.battleRewardOptions.includes(reward)) return false;
    const id = battleRewards[reward].card;
    const pile = [this.room.hand, this.room.deck, this.room.discard].find(pile => pile.includes(id));
    if (!pile) return false;
    let index = 0;
    while (this.build.engravings[`${id}#${index}`] || this.build.rewards[`${id}#${index}`]) index++;
    const ref: CardRef = `${id}#${index}`;
    pile[pile.indexOf(id)] = ref;
    this.build.rewards[ref] = reward;
    this.build.rewardClaimed = true;
    return true;
  }
  get build() { return this.builds[this.loadout]; }
  claimClearReward() {
    if (!this.room.won || this.room.lost || this.rewardedStages.has(this.stage)) return 0;
    const amount = this.stage === this.total - 1 ? 5 : 3;
    this.rewardedStages.add(this.stage); this.coins += amount; return amount;
  }
  buyEngraving(id: CardId, kind: Engraving) {
    if (this.finished || !canEngrave(this.loadout, id, kind) || this.coins < engravingInfo[kind].price) return false;
    const pile = [this.room.hand, this.room.deck, this.room.discard].find(pile => pile.includes(id));
    if (!pile) return false;
    let index = 0;
    while (this.build.engravings[`${id}#${index}`] || this.build.rewards[`${id}#${index}`]) index++;
    const ref: CardRef = `${id}#${index}`;
    pile[pile.indexOf(id)] = ref;
    this.build.engravings[ref] = kind;
    this.coins -= engravingInfo[kind].price;
    return true;
  }
  buyRelic() {
    const price = relicInfo(this.loadout).price;
    if (this.finished || this.loadout === 'basic' || this.build.relic || this.coins < price) return false;
    this.coins -= price; this.build.relic = true; return true;
  }
  buyOpening() {
    if (this.finished || this.build.opening || this.coins < 3) return false;
    this.coins -= 3; this.build.opening = true; return true;
  }
  constructor(seed = 1, loadout: Loadout = 'basic', dungeonId: DungeonId = 'forest') {
    this.loadout = loadout;
    this.seed = seed;
    this.dungeonId = dungeonId;
    const dungeon = dungeons[dungeonId];
    this.activeRooms = dungeon.rooms.slice(dungeon.startIndex ?? 0);
    this.room = new Room(seed, this.activeRooms[0], 5, loadout, this.build);
  }
  setLoadout(next: Loadout) {
    if (next !== this.loadout) {
      this.assassination = 0;
      this.dawnCharge = 0;
    }
    this.loadout = next;
    this.room.build = this.build;
    this.room.setLoadout(next);
  }
  gainAssassination(elite = false) {
    if (this.loadout !== 'rogue') return this.assassination;
    this.assassination = Math.min(3, this.assassination + (elite ? 2 : 1));
    return this.assassination;
  }
  spendAssassination() {
    if (this.loadout !== 'rogue' || this.assassination < 3) return false;
    this.assassination = 0;
    return true;
  }
  get ultimateCharge() { return this.loadout === 'qinghe' ? this.dawnCharge : this.assassination; }
  get ultimateThreshold() { return this.loadout === 'qinghe' ? 4 : 3; }
  gainDawnCharge(action?: MoveAction | null) {
    if (this.loadout === 'qinghe' && action?.dealtDamage && ['advance', 'thrust', 'sweep', 'repel'].includes(action.kind)) this.dawnCharge = Math.min(4, this.dawnCharge + 1);
    return this.dawnCharge;
  }
  spendDawnCharge() {
    if (this.loadout !== 'qinghe' || this.dawnCharge < 4) return false;
    this.dawnCharge = 0;
    return true;
  }
  get definition() {
    return this.activeRooms[this.stage];
  }
  get total() {
    return this.activeRooms.length;
  }
  get won() {
    return this.stage === this.total - 1 && this.room.won;
  }
  get finished() {
    return this.room.lost || this.won;
  }
  get recovery() {
    return this.room.won && !this.won ? Math.min(1, 5 - this.room.health) : 0;
  }
  clearOccupiedExit(): Point | null {
    if (!this.room.won || this.won || !equal(this.room.hero, this.exit)) return null;
    const next: Point = [this.exit[0], this.exit[1] - 1];
    this.room.hero = next;
    return next;
  }
  advance() {
    if (!this.room.won || this.finished || this.pendingBattleReward || !equal(this.room.hero, this.exit)) return false;
    const health = this.room.health + this.recovery;
    this.claimClearReward();
    this.stage++;
    this.room = new Room(this.seed + this.stage * 1009, this.activeRooms[this.stage], health, this.loadout, this.build);
    return true;
  }
}
