import { compare, TILE_KEYS } from "./rules";
import type { GameState, Player } from "./types";

const EMOJI = { hit: "🟩", near: "🟨", miss: "🟥" } as const;

export function shareText(state: GameState, players: Player[], dayNumber: number) {
  const answer = players[state.answer];
  const lines = state.guesses.map(i => {
    const c = compare(players[i], answer);
    return TILE_KEYS.map(k => EMOJI[c[k]]).join("");
  });
  const head = state.mode === "daily" ? `Ligdle #${dayNumber + 1}` : "Ligdle (serbest)";
  return `${head} · ${state.guesses.length} tahminde buldum\n${lines.join("\n")}`;
}
