-- DropIndex
DROP INDEX "Conversation_listingId_buyerId_key";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "listingId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
