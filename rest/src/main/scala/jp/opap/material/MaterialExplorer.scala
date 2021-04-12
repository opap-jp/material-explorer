package jp.opap.material

import java.io.File
import java.util.UUID

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import com.mongodb.MongoClient
import com.mongodb.client.MongoDatabase
import jp.opap.data.yaml.Yaml
import jp.opap.material.dao._
import jp.opap.material.facade.MediaConverter.{ImageConverter, RestResize}
import jp.opap.material.facade.{GitLabRepositoryLoaderFactory, RepositoryCollectionFacade, RepositoryDataEventEmitter}
import jp.opap.material.model.{Manifest, RepositoryConfig}
import jp.opap.material.resource.AppResources
import org.slf4j.{Logger, LoggerFactory}

import scala.concurrent.duration.Duration
import scala.concurrent.{Await, ExecutionContext}

object MaterialExplorer {
  val logger: Logger = LoggerFactory.getLogger(getClass)

  def main(args: Array[String]): Unit = {
    implicit val actorSystem: ActorSystem = ActorSystem()
    implicit val executor: ExecutionContext = actorSystem.dispatcher

    try {
      run()
    } finally {
      actorSystem.terminate()
    }
  }

  def run()(implicit actorSystem: ActorSystem, executor: ExecutionContext): Unit = {
    val serviceBundle = {
      val dbClient = new MongoClient(requireValue("DATABASE_HOST"))
      val db = dbClient.getDatabase(requireValue("DATABASE_NAME"))

      val repositoryDao = new MongoRepositoryDao(db)
      val componentDao = new MongoComponentDao(db)
      val thumbnailDao = new MongoThumbnailDao(db)
      val cacheDao = new GridFsCacheDao(db)
      val resize = new RestResize(requireValue("IMAGEMAGICK_HOST"))

      new ServiceBundle(db, repositoryDao, componentDao, thumbnailDao, cacheDao, resize)
    }
    val repositoryEventEmitter = new RepositoryDataEventEmitter()

    val resources = new AppResources(serviceBundle, repositoryEventEmitter)

    updateRepositoryData(serviceBundle, repositoryEventEmitter)
      .start()

    Http().bindAndHandle(resources.route, "0.0.0.0", 8080)
    logger.info("Started.")
    Await.result(actorSystem.whenTerminated, Duration.Inf)
  }

  def updateRepositoryData(services: ServiceBundle, eventEmitter: RepositoryDataEventEmitter): Thread = {
    val manifest = Manifest.fromYaml(Yaml.parse(new File(requireValue("MANIFEST"))), UUID.randomUUID)
    val repositories = RepositoryConfig.fromYaml(Yaml.parse( new File(requireValue("REPOSITORIES"))))

    val context = RepositoryCollectionFacade.Context(manifest, repositories)
    val converters =Seq(new ImageConverter(services.resize))
    val loaders = Seq(new GitLabRepositoryLoaderFactory(requireValue("GITLAB_PERSONAL_ACCESS_TOKEN")))

    val facade = new RepositoryCollectionFacade(context, services, converters, loaders, eventEmitter)

    new Thread(()  => facade.updateRepositories())
  }

  def requireValue(name: String): String = {
    System.getenv(name) match {
      case value: String => value
      case null => throw new IndexOutOfBoundsException(s"Environment variable ${name} is not set.")
    }
  }
  class ServiceBundle(
    val db: MongoDatabase,
    val repositoryDao: MongoRepositoryDao,
    val componentDao: MongoComponentDao,
    val thumbnailDao: MongoThumbnailDao,
    val cacheDao: CacheDao,
    val resize: RestResize
  )
}
