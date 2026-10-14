export interface Hippodrome {
  libelleCourt?: string;
  libelleLong?: string;
}

export interface Pari {
  codePari?: string;
  libelle?: string;
  enVente?: boolean;
}

export interface ArriveeOfficielle {
  position?: number;
  numPmu?: number;
  numero?: number;
  nom?: string;
  statut?: string;
  temps?: string;
  ecart?: string;
  rapportDirect?: number;
  rapport?: number;
}

export interface Course {
  numOrdre?: number;
  numExterne?: number;
  libelle?: string;
  heureDepart?: number | string;
  distance?: number;
  discipline?: string;
  nombreDeclaresPartants?: number;
  montantPrix?: number;
  categorieParticularite?: string;
  conditions?: string;
  parcours?: string;
  corde?: string;
  statut?: string;
  arriveeDefinitive?: boolean;
  isArriveeDefinitive?: boolean;
  ordreArrivee?: Array<number | ArriveeOfficielle>;
  paris?: Pari[];
}

export interface Reunion {
  numOfficiel?: number;
  numExterne?: number;
  hippodrome?: Hippodrome;
  nature?: string;
  pays?: string | { libelle?: string; code?: string };
  courses?: Course[];
  meteo?: { temperature?: number; nebulositeLibelleCourt?: string };
}

export interface ProgrammeResponse {
  programme?: {
    date?: number | string;
    reunions?: Reunion[];
  };
  reunions?: Reunion[];
}

export interface RapportDirect {
  rapport?: number;
  typeRapport?: string;
  favoris?: boolean;
  indicateurTendance?: string;
  nombreIndicateurTendance?: number;
}

export interface Participant {
  numPmu?: number;
  nom?: string;
  age?: number;
  sexe?: string;
  race?: string;
  driver?: string;
  jockey?: string;
  entraineur?: string;
  proprietaire?: string;
  statut?: string;
  musique?: string;
  placeCorde?: number;
  ordreArrivee?: number;
  positionArrivee?: number;
  dernierRapportDirect?: RapportDirect;
  rapportDirect?: number;
  gainsCarriere?: number;
  nombreCourses?: number;
  nombreVictoires?: number;
  nomPere?: string;
  nomMere?: string;
  deferre?: string;
  oeilleres?: string;
  poidsConditionMonte?: number;
  incident?: string;
}

export interface ParticipantsResponse {
  participants?: Participant[];
}

export interface SelectionItem {
  rang?: number;
  num_partant?: number;
  numPartant?: number;
  cote_prob?: number;
  coteProb?: number;
  nom?: string;
}

export interface PronosticsResponse {
  selection?: SelectionItem[];
}

export interface PronosticsDetaillesResponse {
  commentaire?: { texte?: string; source?: string } | string;
  source?: string;
}

export interface ArriveeEntry {
  place: number;
  numPmu: number;
  nom: string;
  statut: string;
  ecart: string;
  rapport?: number;
}

export interface CourseDetail {
  reunion: Reunion;
  course: Course;
}
