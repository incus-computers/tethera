import "server-only";
import { BaseRepository } from "./base.repository";
import { CustomBuild } from "../types";

export class CustomBuildsRepository extends BaseRepository<CustomBuild> {
  constructor() {
    super("custom_builds", []);
  }

  async findByShareSlug(shareSlug: string): Promise<CustomBuild | null> {
    return this.findOne({ share_slug: shareSlug });
  }

  async saveBuild(data: Omit<CustomBuild, "id" | "created_at">): Promise<CustomBuild> {
    return this.create(data);
  }
}

export const customBuildsRepository = new CustomBuildsRepository();
