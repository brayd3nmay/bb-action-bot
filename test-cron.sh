
source .env
echo "Testing cron endpoint..."
echo "URL: https://bot.bbosu.org/api/cron"
echo ""

curl -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  https://bot.bbosu.org/api/cron

echo ""
echo ""
echo "Test complete!"
