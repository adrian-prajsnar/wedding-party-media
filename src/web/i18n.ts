export const copy = {
  skip: "Przejdź do treści",

  navGallery: "Galeria",
  navUpload: "Dodaj zdjęcia",

  kicker: "Nasz weselny album",
  galleryTitle: "Wesele Waszymi oczami!",
  galleryLead:
    "Nie możemy być wszędzie naraz, ale Wy możecie nam wszystko pokazać! Wrzucajcie zdjęcia i filmy, niech nic nas nie ominie!",
  galleryNotes: ["Bez logowania", "Zdjęcia i filmy", "Na żywo"],
  galleryCta: "Wrzuć swoje zdjęcia",
  refresh: "Odśwież",

  emptyTitle: "Kto wrzuci pierwsze zdjęcie?",
  empty: "Galeria czeka na Wasze fotki. Kto pierwszy, ten lepszy!",
  emptyCta: "Dodaj pierwsze zdjęcie",

  loadMore: "Pokaż więcej",
  loading: "Wczytywanie…",
  loadError: "Coś poszło nie tak. Spróbujcie odświeżyć stronę.",

  uploadKicker: "Pokażcie, co się dzieje!",
  uploadTitle: "Macie coś dobrego? Wrzucajcie!",

  nameLabel: "Kto wrzuca?",
  namePlaceholder: "np. Ciocia Basia",
  nameHint: "Podpis jest opcjonalny. Można też pozostać anonimowym!",

  fileLabel: "Zdjęcia i filmy",
  fileButton: "Wybierz zdjęcia lub filmy",
  fileButtonHint: "Filmy maksymalnie do minuty",
  fileReplace: "Zmień wybór",

  submit: "Wrzuć do galerii",
  clear: "Wyczyść wybór",
  removePreview: "Usuń",
  sending: "Wrzucamy…",

  uploadedTitle: "No i pięknie! ❤️",
  uploaded: "Wasze fotki są już w galerii. Dzięki i bawcie się dobrze!",
  uploadMore: "Wrzuć kolejne",
  backToGallery: "Zobacz galerię",

  videoTooLong: "Ten film jest za długi. Maksymalnie minuta!",
  fileTooBig: "Ten plik jest za duży.",
  photoTooBig: "To zdjęcie jest za duże, nawet po zmniejszeniu.",
  sourcePhotoTooBig: "To zdjęcie jest za duże. Wybierzcie inne.",
  unreadable: "Nie udało się odczytać pliku. Spróbujcie z innym.",
  unsupported: "Tego formatu nie obsługujemy.",
  uploadFailed: "Ups! Nie udało się dodać pliku. Spróbujcie ponownie.",
  tooMany: "Za dużo plików naraz. Spróbujcie za chwilę.",
  nameTooLong: "Podpis może mieć maksymalnie 40 znaków.",

  close: "Zamknij",
  previous: "Poprzednie",
  next: "Następne",
  download: "Pobierz",
  playbackFailed: "Nie udało się odtworzyć filmu na tym urządzeniu.",

  adminKicker: "Dla pary młodej",
  adminTitle: "Nasz weselny album",
  adminLead: "Wszystkie zdjęcia i filmy od gości w jednym miejscu. Możecie je ukrywać lub usuwać.",

  passwordLabel: "Hasło",
  login: "Zaloguj się",
  loginError: "Nieprawidłowe hasło.",
  logout: "Wyloguj się",

  qrLink: "Kod QR",
  qrKicker: "Dla naszych gości",
  qrTitle: "Skanujcie i wrzucajcie!",
  qrLead:
    "Wydrukujcie kod QR i ustawcie go na stołach. Goście mogą od razu dodawać zdjęcia i filmy.",
  qrCta: "Skanuj i wrzucaj fotki!",
  print: "Drukuj",

  hide: "Ukryj",
  unhide: "Pokaż",
  remove: "Usuń",
  removeConfirm: "Na pewno usunąć ten plik? Nie można tego cofnąć.",
  removeFailed: "Nie udało się usunąć pliku.",
  hidden: "Ukryte",
  visible: "Widoczne",
  open: "Otwórz",
  adminEmpty: "Jeszcze nikt nic nie dodał.",
  backAdmin: "Wróć do listy",

  photo: "Zdjęcie",
  video: "Film",
  anonymous: "Anonimowy",
  footerPhotoAlt: "Para młoda na moście przed domem weselnym",
} as const;

export function formatPostedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function plural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}

export function formatMemories(count: number, more: boolean): string {
  const word = more ? "wspomnień" : plural(count, "wspomnienie", "wspomnienia", "wspomnień");
  return more ? `${count}+ ${word}` : `${count} ${word}`;
}

export function formatRemovePreview(name: string): string {
  return `Usuń: ${name}`;
}

export function formatSubmit(count: number): string {
  if (count <= 1) return copy.submit;
  return `Wrzuć ${count} ${plural(count, "plik", "pliki", "plików")} do galerii`;
}

export function formatAdminSummary(total: number, hidden: number): string {
  const files = `${total} ${plural(total, "plik", "pliki", "plików")}`;
  return hidden > 0 ? `${files} · ${hidden} ${plural(hidden, "ukryty", "ukryte", "ukrytych")}` : files;
}

export function messageForError(code: string): string {
  switch (code) {
    case "name_too_long":
      return copy.nameTooLong;
    case "too_many":
      return copy.tooMany;
    case "too_large":
      return copy.fileTooBig;
    case "bad_type":
      return copy.unsupported;
    case "unauthorized":
      return copy.loginError;
    default:
      return copy.uploadFailed;
  }
}
