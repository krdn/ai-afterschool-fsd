-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "mentionedEntities" JSONB;

-- GIN 인덱스: 엔티티별 메시지 필터링 지원
-- 예시: WHERE "mentionedEntities" @> '[{"id": "xxx"}]'
CREATE INDEX idx_chat_messages_mentioned_entities
ON chat_messages USING GIN ("mentionedEntities" jsonb_path_ops);
