export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          archived: boolean
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          archived?: boolean
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          archived?: boolean
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doc_files: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          owner_id: string
          project_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          owner_id?: string
          project_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          owner_id?: string
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "doc_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          parent_id: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          parent_id?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          parent_id?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "doc_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      epics: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          position: number
          project_id: string
          source_line_id: string | null
          status: Database["public"]["Enums"]["epic_status"]
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id?: string
          position?: number
          project_id: string
          source_line_id?: string | null
          status?: Database["public"]["Enums"]["epic_status"]
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number
          project_id?: string
          source_line_id?: string | null
          status?: Database["public"]["Enums"]["epic_status"]
        }
        Relationships: [
          {
            foreignKeyName: "epics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "epics_source_line_id_fkey"
            columns: ["source_line_id"]
            isOneToOne: false
            referencedRelation: "estimate_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_lines: {
        Row: {
          description: string
          detail: string | null
          estimate_id: string
          hours: number | null
          id: string
          kind: Database["public"]["Enums"]["line_kind"]
          owner_id: string
          position: number
          qty: number
          taxable: boolean
          unit: Database["public"]["Enums"]["line_unit"]
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          description: string
          detail?: string | null
          estimate_id: string
          hours?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["line_kind"]
          owner_id?: string
          position: number
          qty?: number
          taxable?: boolean
          unit?: Database["public"]["Enums"]["line_unit"]
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          description?: string
          detail?: string | null
          estimate_id?: string
          hours?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["line_kind"]
          owner_id?: string
          position?: number
          qty?: number
          taxable?: boolean
          unit?: Database["public"]["Enums"]["line_unit"]
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_lines_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          currency: string
          discount_cents: number
          doc_config: Json | null
          id: string
          issue_date: string
          notes: string | null
          number: string
          owner_id: string
          project_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["estimate_status"]
          subtotal_cents: number | null
          tax_cents: number | null
          tax_rate: number
          terms: string | null
          title: string | null
          total_cents: number | null
          total_hours: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          currency?: string
          discount_cents?: number
          doc_config?: Json | null
          id?: string
          issue_date?: string
          notes?: string | null
          number: string
          owner_id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_cents?: number | null
          tax_cents?: number | null
          tax_rate?: number
          terms?: string | null
          title?: string | null
          total_cents?: number | null
          total_hours?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          discount_cents?: number
          doc_config?: Json | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string
          owner_id?: string
          project_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["estimate_status"]
          subtotal_cents?: number | null
          tax_cents?: number | null
          tax_rate?: number
          terms?: string | null
          title?: string | null
          total_cents?: number | null
          total_hours?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      line_presets: {
        Row: {
          created_at: string
          id: string
          lines: Json
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lines?: Json
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          lines?: Json
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          code: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          owner_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          owner_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          owner_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          branding: Json
          company: Json
          created_at: string
          estimate_defaults: Json
          id: string
          next_estimate_seq: number
          owner_id: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          company?: Json
          created_at?: string
          estimate_defaults?: Json
          id?: string
          next_estimate_seq?: number
          owner_id?: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          company?: Json
          created_at?: string
          estimate_defaults?: Json
          id?: string
          next_estimate_seq?: number
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          depends_on: string
          id: string
          owner_id: string
          task_id: string
          type: Database["public"]["Enums"]["dependency_type"]
        }
        Insert: {
          depends_on: string
          id?: string
          owner_id?: string
          task_id: string
          type?: Database["public"]["Enums"]["dependency_type"]
        }
        Update: {
          depends_on?: string
          id?: string
          owner_id?: string
          task_id?: string
          type?: Database["public"]["Enums"]["dependency_type"]
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          epic_id: string | null
          estimate_hours: number | null
          id: string
          owner_id: string
          parent_id: string | null
          position: number
          project_id: string
          source_line_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          epic_id?: string | null
          estimate_hours?: number | null
          id?: string
          owner_id?: string
          parent_id?: string | null
          position?: number
          project_id: string
          source_line_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          epic_id?: string | null
          estimate_hours?: number | null
          id?: string
          owner_id?: string
          parent_id?: string | null
          position?: number
          project_id?: string
          source_line_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_line_id_fkey"
            columns: ["source_line_id"]
            isOneToOne: false
            referencedRelation: "estimate_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          hours: number
          id: string
          note: string | null
          owner_id: string
          project_id: string
          spent_on: string
          task_id: string | null
        }
        Insert: {
          created_at?: string
          hours: number
          id?: string
          note?: string | null
          owner_id?: string
          project_id: string
          spent_on?: string
          task_id?: string | null
        }
        Update: {
          created_at?: string
          hours?: number
          id?: string
          note?: string | null
          owner_id?: string
          project_id?: string
          spent_on?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_estimate: {
        Args: { p_estimate: string; p_project_name?: string }
        Returns: string
      }
      delete_docs: {
        Args: { p_files: string[]; p_folders: string[] }
        Returns: string[]
      }
      move_docs: {
        Args: { p_files: string[]; p_folders: string[]; p_target?: string }
        Returns: undefined
      }
      move_task: {
        Args: {
          p_epic?: string
          p_ids: string[]
          p_positions: number[]
          p_status: Database["public"]["Enums"]["task_status"]
          p_task: string
        }
        Returns: undefined
      }
      task_actual_hours: {
        Args: { t: Database["public"]["Tables"]["tasks"]["Row"] }
        Returns: number
      }
    }
    Enums: {
      dependency_type:
        | "finish_to_start"
        | "start_to_start"
        | "finish_to_finish"
        | "start_to_finish"
      epic_status: "planned" | "active" | "done"
      estimate_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      line_kind: "section" | "item"
      line_unit: "hours" | "days" | "fixed"
      project_status: "active" | "on_hold" | "completed" | "archived"
      task_status:
        | "backlog"
        | "todo"
        | "in_progress"
        | "blocked"
        | "review"
        | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      dependency_type: [
        "finish_to_start",
        "start_to_start",
        "finish_to_finish",
        "start_to_finish",
      ],
      epic_status: ["planned", "active", "done"],
      estimate_status: ["draft", "sent", "accepted", "rejected", "expired"],
      line_kind: ["section", "item"],
      line_unit: ["hours", "days", "fixed"],
      project_status: ["active", "on_hold", "completed", "archived"],
      task_status: [
        "backlog",
        "todo",
        "in_progress",
        "blocked",
        "review",
        "done",
      ],
    },
  },
} as const

