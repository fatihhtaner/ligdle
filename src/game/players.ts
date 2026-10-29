import type { Player } from "./types";
import data from "./players.json";

// Veri scripts/build_players.py ile kurulur; elle düzeltmeler data/overrides.csv dosyasına yazılır.
export const PLAYERS = data as Player[];
