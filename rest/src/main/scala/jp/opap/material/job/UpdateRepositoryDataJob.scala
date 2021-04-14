package jp.opap.material.job

import java.io.File
import java.util.UUID

import jp.opap.data.yaml.Yaml
import jp.opap.material.MaterialExplorer
import jp.opap.material.MaterialExplorer.{ServiceBundle, requireValue}
import jp.opap.material.facade.MediaConverter.ImageConverter
import jp.opap.material.facade.{GitLabRepositoryLoaderFactory, RepositoryCollectionFacade, RepositoryDataEventEmitter}
import jp.opap.material.model.{Manifest, RepositoryConfig}

object UpdateRepositoryDataJob {
  def main(args: Array[String]): Unit = {
    val services = MaterialExplorer.resolveServiceBundle()
    val eventEmitter = new RepositoryDataEventEmitter()

    val manifest = Manifest.fromYaml(Yaml.parse(new File(requireValue("MANIFEST"))), UUID.randomUUID)
    val repositories = RepositoryConfig.fromYaml(Yaml.parse( new File(requireValue("REPOSITORIES"))))

    val context = RepositoryCollectionFacade.Context(manifest, repositories)
    val converters =Seq(new ImageConverter(services.resize))
    val loaders = Seq(new GitLabRepositoryLoaderFactory(requireValue("GITLAB_PERSONAL_ACCESS_TOKEN")))

    val facade = new RepositoryCollectionFacade(context, services, converters, loaders, eventEmitter)

    facade.updateRepositories()
  }
}
