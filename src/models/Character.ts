export interface Character {
  characterId: string;
  companyName: string;
  themeColor: string;
  openingMessage: string;
}

export function characterFromJson(json: any): Character {
  return {
    characterId: json.character_id ?? '',
    companyName: json.company_name ?? '',
    themeColor: json.theme_color ?? '#007AFF',
    openingMessage: json.opening_message ?? '',
  };
}
