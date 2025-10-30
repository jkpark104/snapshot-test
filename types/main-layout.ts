export type ItemSize = {
  height: number;
  width: number;
};

export type Media = {
  type: "LOTTIE" | "IMAGE";
  url: string;
};

export type Tooltip = {
  backgroundColor: string;
  text: {
    color: string;
    value: string;
  };
};

export type Item = {
  actionUrl: string;
  blockAccess: boolean | null;
  itemSize: ItemSize;
  loggingName: string;
  media: Media | null;
  subTitle: { color: string; value: string } | null;
  title: { color: string; value: string } | null;
  tooltip: Tooltip | null;
};

export type Header = {
  description: {
    color: string;
    value: string;
  } | null;
  title: {
    color: string;
    value: string;
  } | null;
};

export type ComponentSize = {
  height: number;
  width: number;
};

export type HorizontalSpacer = {
  header: Header | null;
  height: number;
  type: "HORIZONTAL_SPACER";
};

export type CollectionHalf = {
  componentSize: ComponentSize;
  header: Header | null;
  items: Item[];
  type: "COLLECTION_HALF";
};

export type CollectionThird = {
  componentSize: ComponentSize;
  header: Header | null;
  items: Item[];
  type: "COLLECTION_THIRD";
};

export type CollectionFull = {
  componentSize: ComponentSize;
  header: Header | null;
  items: Item[];
  type: "COLLECTION_FULL";
};

export type Banner = {
  actionUrl: string;
  bannerType: string;
  header: Header | null;
  loggingName: string;
  type: "BANNER";
};

export type Carousel = {
  componentSize: ComponentSize;
  header: Header | null;
  items: Item[];
  type: "COLLECTION_CAROUSEL";
};

export type CollectionContainer = {
  componentSize: ComponentSize;
  header: Header | null;
  items: Item[];
  type: "COLLECTION_CONTAINER";
};

export type NoticeCollectionFull = {
  componentSize: ComponentSize;
  header: Header | null;
  items: Item[];
  type: "NOTICE_COLLECTION_FULL";
};

export type Component =
  | HorizontalSpacer
  | CollectionHalf
  | CollectionThird
  | Banner
  | CollectionFull
  | Carousel
  | CollectionContainer
  | NoticeCollectionFull;

export type TabTag = {
  text: {
    color: string;
    value: string;
  };
  type: "NONE" | "ROLLING";
};

export type Tab = {
  components: Component[];
  displayName: string;
  displayOrder: number;
  id: number;
  loggingName: string;
  name: string;
  tag?: TabTag | null;
  useBuiltInView?: boolean;
};

export type MainLayout = {
  layout: {
    tabs: Tab[];
  };
  layoutVersion: string;
};
