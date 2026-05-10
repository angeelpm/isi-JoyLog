const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/LibraryEntryModal.tsx', 'utf8');

const updated = content.replace(
`  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await RawgAPI.getGameDetails(game.rawgGameId.toString());
        setGameDetails(data);
      } catch (err) {
        console.error('Failed to fetch RAWG details', err);
      } finally {
        setLoadingDetails(false);
      }
    };
    if (game.rawgGameId) fetchDetails();
    else setLoadingDetails(false);
  }, [game.rawgGameId]);`,

`  const [loadingDetails, setLoadingDetails] = useState(true);
  const [communityReviews, setCommunityReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await RawgAPI.getGameDetails(game.rawgGameId.toString());
        setGameDetails(data);
      } catch (err) {
        console.error('Failed to fetch RAWG details', err);
      } finally {
        setLoadingDetails(false);
      }
    };
    const fetchReviews = async () => {
      try {
        const { data } = await LibraryAPI.getGameReviews(game.rawgGameId);
        setCommunityReviews(data.reviews || []);
      } catch (err) {
        console.error('Failed to fetch community reviews', err);
      }
    };
    if (game.rawgGameId) {
      fetchDetails();
      fetchReviews();
    } else {
      setLoadingDetails(false);
    }
  }, [game.rawgGameId]);`
);
fs.writeFileSync('frontend/src/components/LibraryEntryModal.tsx', updated);
